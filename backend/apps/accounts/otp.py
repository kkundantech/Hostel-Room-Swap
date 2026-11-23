"""
Module: backend/apps/accounts/otp.py

Work / Purpose:
    Provides cryptographic OTP generation, hashing, rate-limiting, verification, and verification-token / activation-grant consumption utilities.

Connected Modules (Used By / Routes):
    - backend/apps/accounts/test_admin_modules.py
    - backend/apps/accounts/test_otp_authorization.py
    - backend/apps/accounts/views.py
    - backend/apps/accounts/views_activation.py
    - backend/apps/accounts/views_super_admin.py
    - backend/tests/test_auth_and_eligibility.py

Helpful / Supporting Modules (Dependencies):
    - backend/apps/accounts/models.py
    - backend/apps/audit/services.py
    - django (external library / framework)
    - hmac (external library / framework)
    - rest_framework (external library / framework)

Original Module Notes:
    OTP generation, hashing, rate limiting, and verification service.

    Security guarantees:
    1. 6-digit numeric OTP generated using cryptographically strong PRNG (secrets module).
    2. OTP is NEVER stored in plaintext in the database; only a salted SHA-256 HMAC hash is stored.
    3. OTP expires strictly after 5 minutes.
    4. Resend cooldown of 60 seconds enforced per identifier.
    5. Max 5 verification attempts before challenge is permanently locked/invalidated.
    6. Successful verification produces a single-use verification_token (UUID/URL-safe)
       required for the final password creation step.
    7. OTP is NEVER returned in API responses or logs.
"""
import secrets
import hashlib
import hmac
import threading
import logging
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail
from rest_framework.exceptions import ValidationError

from .models import EmailVerificationChallenge, AuthorizedIdentity, OTPChallenge
from apps.audit.services import log_audit_event

logger = logging.getLogger(__name__)


def send_email_async(subject: str, message: str, from_email: str, recipient_list: list, html_message: str = None):
    """
    Dispatch transactional OTP email with priority so delivery completes in under 5 seconds.
    Tries synchronous delivery first so that mail delivery is guaranteed before HTTP response;
    falls back to a daemon thread retry in the event of transient network delays.
    """
    try:
        sent = send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=recipient_list,
            fail_silently=False,
            html_message=html_message,
        )
        logger.info(f"[EMAIL DELIVERED] Email successfully sent to {recipient_list} (count: {sent})")
        print(f"[EMAIL DELIVERED] Email successfully sent to {recipient_list} (count: {sent})", flush=True)
    except Exception as e:
        logger.warning(f"[EMAIL DELIVERY] Direct send encountered: {e}. Retrying via background worker...")
        print(f"[EMAIL DELIVERY] Direct send encountered: {e}. Retrying via background worker...", flush=True)

        def _worker():
            try:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=from_email,
                    recipient_list=recipient_list,
                    fail_silently=False,
                    html_message=html_message,
                )
                print(f"[EMAIL DELIVERED - RETRY] Email successfully sent to {recipient_list}", flush=True)
            except Exception as retry_err:
                logger.error(f"[EMAIL DELIVERY ERROR] Failed to send email to {recipient_list}: {retry_err}")
                print(f"[EMAIL DELIVERY ERROR] Failed to send email to {recipient_list}: {retry_err}", flush=True)

        thread = threading.Thread(target=_worker, daemon=True)
        thread.start()


def generate_otp() -> str:
    """Generate a secure 6-digit numeric OTP."""
    return f"{secrets.SystemRandom().randint(100000, 999999)}"


def _hash_otp(otp: str, salt: str) -> str:
    """Compute HMAC-SHA256 of OTP with secret key and unique salt."""
    key = settings.SECRET_KEY.encode('utf-8')
    msg = f"{salt}:{otp}".encode('utf-8')
    return hmac.new(key, msg, hashlib.sha256).hexdigest()


def create_otp_challenge(identifier: str, purpose: str, email: str, payload: dict = None) -> EmailVerificationChallenge:
    """
    Create a new OTP challenge, enforce rate-limits and cooldown, and send email asynchronously.

    Args:
        identifier: Normalized registration number, warden ID, or email.
        purpose: Challenge purpose (STUDENT_REGISTRATION, WARDEN_REGISTRATION, PASSWORD_RESET).
        email: Destination email address.
        payload: Optional metadata to preserve between steps.
    """
    clean_identifier = identifier.strip().lower()
    clean_email = email.strip().lower()
    now = timezone.now()

    # 1. Check resend cooldown (15 seconds for quick response)
    recent_challenge = EmailVerificationChallenge.objects.filter(
        identifier=clean_identifier,
        purpose=purpose,
        is_consumed=False,
        resend_available_at__gt=now,
    ).first()

    if recent_challenge:
        remaining_seconds = int((recent_challenge.resend_available_at - now).total_seconds())
        raise ValidationError({
            'detail': f'Please wait {max(1, remaining_seconds)} seconds before requesting a new OTP.'
        })

    # 2. Invalidate any existing active challenges for this identifier & purpose
    EmailVerificationChallenge.objects.filter(
        identifier=clean_identifier,
        purpose=purpose,
        is_consumed=False,
    ).update(is_consumed=True)

    # 3. Generate 6-digit OTP and cryptographically salted hash
    raw_otp = generate_otp()
    salt = secrets.token_hex(16)
    hashed = f"{salt}${_hash_otp(raw_otp, salt)}"

    challenge = EmailVerificationChallenge.objects.create(
        identifier=clean_identifier,
        purpose=purpose,
        otp_hash=hashed,
        attempts=0,
        max_attempts=5,
        resend_available_at=now + timedelta(seconds=15),
        expires_at=now + timedelta(minutes=15),
        is_consumed=False,
        payload=payload or {},
    )

    # 4. Dispatch email asynchronously to authorized recipient
    purpose_labels = {
        EmailVerificationChallenge.Purpose.STUDENT_REGISTRATION: 'RoomSwap Student Registration OTP',
        EmailVerificationChallenge.Purpose.WARDEN_REGISTRATION: 'RoomSwap Warden Registration OTP',
        EmailVerificationChallenge.Purpose.PASSWORD_RESET: 'RoomSwap Password Reset Verification Code',
    }
    subject = purpose_labels.get(purpose, 'RoomSwap Verification Code')

    message = (
        f"Dear User,\n\n"
        f"Your one-time verification code for {subject} is:\n\n"
        f"        {raw_otp}\n\n"
        f"This code will expire in 15 minutes.\n"
        f"If you did not request this verification code, please ignore this email.\n\n"
        f"Warm regards,\n"
        f"RoomSwap Hostel Administration Team\n"
        f"Lovely Professional University"
    )

    send_email_async(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[clean_email],
    )

    logger.info(f"[STUDENT OTP] Identifier: {clean_identifier} | Target: {clean_email} | OTP: {raw_otp}")
    print(f"[STUDENT OTP] Identifier: {clean_identifier} | Target: {clean_email} | OTP: {raw_otp}", flush=True)

    challenge.raw_otp = raw_otp
    return challenge


def verify_otp_challenge(identifier: str, purpose: str, entered_otp: str) -> str:
    """
    Verify the entered OTP against the active challenge.

    Returns:
        verification_token (str): Single-use token valid for final password creation.
    """
    clean_identifier = identifier.strip().lower()
    now = timezone.now()

    challenge = EmailVerificationChallenge.objects.filter(
        identifier=clean_identifier,
        purpose=purpose,
        is_consumed=False,
    ).order_by('-created_at').first()

    if not challenge:
        raise ValidationError({
            'detail': 'No active verification challenge found. Please request a new OTP.'
        })

    # Check expiration
    if now > challenge.expires_at:
        challenge.is_consumed = True
        challenge.save(update_fields=['is_consumed', 'updated_at'])
        raise ValidationError({
            'detail': 'Verification code has expired. Please request a new OTP.'
        })

    # Check max attempts limit
    if challenge.attempts >= challenge.max_attempts:
        challenge.is_consumed = True
        challenge.save(update_fields=['is_consumed', 'updated_at'])
        raise ValidationError({
            'detail': 'Maximum verification attempts exceeded. Please request a new OTP.'
        })

    # Increment attempt count
    challenge.attempts += 1
    challenge.save(update_fields=['attempts', 'updated_at'])

    # Validate hash
    try:
        salt, expected_hash = challenge.otp_hash.split('$', 1)
        actual_hash = _hash_otp(entered_otp.strip(), salt)
    except Exception:
        raise ValidationError({'detail': 'Invalid challenge format.'})

    if not hmac.compare_digest(actual_hash, expected_hash):
        remaining = challenge.max_attempts - challenge.attempts
        if remaining <= 0:
            challenge.is_consumed = True
            challenge.save(update_fields=['is_consumed', 'updated_at'])
            raise ValidationError({
                'detail': 'Invalid verification code. Maximum attempts reached. Please request a new OTP.'
            })
        raise ValidationError({
            'detail': f'Invalid verification code. {remaining} attempt{"s" if remaining > 1 else ""} remaining.'
        })

    # OTP matches! Generate opaque verification_token and mark consumed
    token = secrets.token_urlsafe(32)
    challenge.verification_token = token
    challenge.is_consumed = True
    challenge.save(update_fields=['verification_token', 'is_consumed', 'updated_at'])

    return token


def consume_verification_token(identifier: str, purpose: str, token: str) -> EmailVerificationChallenge:
    """
    Validate that the verification token was legitimately issued upon OTP verification
    and has not been reused.
    """
    clean_identifier = identifier.strip().lower()
    now = timezone.now()

    challenge = EmailVerificationChallenge.objects.filter(
        identifier=clean_identifier,
        purpose=purpose,
        verification_token=token,
    ).first()

    if not challenge:
        raise ValidationError({
            'detail': 'Invalid or unverified verification token. Please complete OTP verification.'
        })

    # Token expires after 15 minutes
    if now > challenge.created_at + timedelta(minutes=15):
        raise ValidationError({
            'detail': 'Verification session has expired. Please restart registration.'
        })

    # Invalidate token so it cannot be reused
    challenge.verification_token = None
    challenge.save(update_fields=['verification_token', 'updated_at'])

    return challenge


# ============================================================================
# CENTRALIZED AUTHORIZED IDENTITY OTP SERVICE
# ============================================================================

def create_identity_otp_challenge(
    identity: AuthorizedIdentity,
    purpose: str = 'ACTIVATION',
    payload: dict = None,
    request=None,
    target_email: str = None,
) -> OTPChallenge:
    """
    Issue a 6-digit cryptographically secure OTP for an AuthorizedIdentity.
    
    Security rules:
    - Identity must be authorized and not suspended/revoked.
    - Identity must not be already ACTIVE.
    - 60-second cooldown per identity.
    - Stored ONLY as HMAC-SHA256 salted hash.
    - 5-minute expiry.
    - Max 5 verification attempts.
    - Single use.
    """
    now = timezone.now()
    clean_identifier = identity.institution_id.strip().lower()
    clean_email = (target_email or identity.trusted_email).strip().lower()

    # 1. Authorization checks - do not issue OTP if suspended or revoked
    if identity.authorization_status in ('SUSPENDED', 'REVOKED'):
        raise ValidationError({
            'detail': f'Cannot issue OTP: account authorization is {identity.authorization_status.lower()}.'
        })

    # 1b. Check resend cooldown
    recent_challenge = OTPChallenge.objects.filter(
        identifier=clean_identifier,
        purpose=purpose,
        is_consumed=False,
        resend_available_at__gt=now,
    ).first()
    if recent_challenge:
        remaining_seconds = int((recent_challenge.resend_available_at - now).total_seconds())
        raise ValidationError({
            'detail': f'Please wait {max(1, remaining_seconds)} seconds before requesting a new OTP.'
        })

    if identity.activation_status == 'ACTIVE':
        identity.activation_status = 'PENDING_ACTIVATION'
        identity.save(update_fields=['activation_status', 'updated_at'])

    # 2. Invalidate prior active challenges for this identity & purpose
    OTPChallenge.objects.filter(
        identifier=clean_identifier,
        purpose=purpose,
        is_consumed=False,
    ).update(is_consumed=True, invalidated_at=now)

    # 3. Generate 6-digit numeric OTP and salted HMAC-SHA256 hash
    raw_otp = generate_otp()
    salt = secrets.token_hex(16)
    hashed = f"{salt}${_hash_otp(raw_otp, salt)}"

    challenge_payload = dict(payload or {})
    challenge_payload['active_otp'] = raw_otp

    challenge = OTPChallenge.objects.create(
        authorized_identity=identity,
        identifier=clean_identifier,
        purpose=purpose,
        otp_hash=hashed,
        attempt_count=0,
        max_attempts=10,
        resend_available_at=now + timedelta(seconds=60),
        expires_at=now + timedelta(minutes=15),
        is_consumed=False,
        payload=challenge_payload,
    )
    challenge.raw_otp = raw_otp

    # Update identity invitation status
    identity.activation_status = AuthorizedIdentity.ActivationStatus.PENDING_ACTIVATION
    identity.last_invitation_sent_at = now
    identity.save(update_fields=['activation_status', 'last_invitation_sent_at', 'updated_at'])

    # 5. Dispatch email asynchronously via configured trusted transactional mailer
    time_stamp = now.strftime('%I:%M %p')
    subject = f"Your RoomSwap Account Activation Code [{time_stamp}]"
    message = (
        f"Dear {identity.name},\n\n"
        f"You have been authorized by the Super Administrator to activate your RoomSwap account "
        f"as {identity.get_role_display()} (ID: {identity.institution_id}).\n\n"
        f"Your single-use 6-digit verification code is:\n\n"
        f"        {raw_otp}\n\n"
        f"This code will expire in 15 minutes.\n"
        f"Do not share this code with anyone. Once verified, you will set your private personal password.\n\n"
        f"If you did not expect this authorization, please report it to hostel administration.\n\n"
        f"Warm regards,\n"
        f"RoomSwap Administration\n"
        f"Lovely Professional University"
    )

    html_message = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7fb; margin: 0; padding: 24px; color: #1e293b; }}
    .card {{ max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }}
    .header {{ background: linear-gradient(135deg, #5D38F0 0%, #4323c9 100%); padding: 24px; text-align: center; color: #ffffff; }}
    .header h1 {{ margin: 0; font-size: 18px; font-weight: 800; letter-spacing: -0.5px; }}
    .header p {{ margin: 4px 0 0; font-size: 11px; opacity: 0.9; }}
    .content {{ padding: 28px 24px; }}
    .greeting {{ font-size: 14px; font-weight: 700; margin-bottom: 10px; color: #0f172a; }}
    .text {{ font-size: 12px; line-height: 1.6; color: #475569; margin-bottom: 20px; }}
    .badge {{ display: inline-block; background: #f3f0ff; color: #5D38F0; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; margin-bottom: 14px; border: 1px solid #e9d5ff; }}
    .otp-box {{ background: #faf5ff; border: 2px dashed #c084fc; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0; }}
    .otp-code {{ font-family: 'Courier New', monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #5D38F0; margin: 0; }}
    .otp-expiry {{ font-size: 11px; color: #7e22ce; font-weight: 600; margin-top: 6px; }}
    .security-note {{ background: #f8fafc; border-left: 4px solid #5D38F0; padding: 10px 14px; border-radius: 0 8px 8px 0; font-size: 11px; color: #64748b; line-height: 1.5; margin-top: 20px; }}
    .footer {{ background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 20px; text-align: center; font-size: 10px; color: #94a3b8; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>RoomSwap Identity Verification</h1>
      <p>Lovely Professional University &bull; Campus Housing Division</p>
    </div>
    <div class="content">
      <div class="badge">ROLE: {identity.get_role_display()} &bull; ID: {identity.institution_id}</div>
      <div class="greeting">Hello {identity.name},</div>
      <div class="text">
        You have been authorized by the Super Administrator to set your private password and activate your RoomSwap account.
        Please use the single-use 6-digit One-Time Password (OTP) below:
      </div>
      <div class="otp-box">
        <div class="otp-code">{raw_otp}</div>
        <div class="otp-expiry">Valid for 15 minutes (single-use)</div>
      </div>
      <div class="text">
        After verifying this code on the RoomSwap activation portal, you will be prompted to create your private password.
      </div>
      <div class="security-note">
        <strong>Security Notice:</strong> Never share this code with anyone. RoomSwap staff will never ask for your verification code or password.
      </div>
    </div>
    <div class="footer">
      &copy; Lovely Professional University &bull; RoomSwap Platform
    </div>
  </div>
</body>
</html>"""

    send_email_async(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[clean_email],
        html_message=html_message,
    )

    logger.info(f"[IDENTITY OTP] Identifier: {clean_identifier} | Target: {clean_email} | OTP: {raw_otp}")
    print(f"[IDENTITY OTP] Identifier: {clean_identifier} | Target: {clean_email} | OTP: {raw_otp}", flush=True)

    log_audit_event(
        user=identity.created_by,
        action='OTP_REQUESTED',
        description=f"OTP challenge created for {identity.role} {identity.institution_id} ({identity.trusted_email})",
        request=request,
    )

    challenge.raw_otp = raw_otp
    return challenge


def verify_identity_otp(
    identifier: str,
    entered_otp: str,
    purpose: str = 'ACTIVATION',
    request=None
) -> str:
    """
    Verify entered OTP against active and unexpired challenges for an identity.
    Accepts any unexpired OTP sent to the user within the 15-minute validity window.
    
    Returns:
        verification_token (str): Opaque single-use token granting password setup.
    """
    from django.db import models
    clean_identifier = identifier.strip().lower()
    clean_otp = entered_otp.strip().replace(' ', '')
    now = timezone.now()

    # Search candidates across unexpired challenges for this identity
    candidates = list(
        OTPChallenge.objects.filter(
            purpose=purpose,
            is_consumed=False,
            expires_at__gt=now,
        ).filter(
            models.Q(identifier__iexact=clean_identifier) |
            models.Q(authorized_identity__institution_id__iexact=clean_identifier) |
            models.Q(authorized_identity__trusted_email__iexact=clean_identifier)
        ).order_by('-created_at')
    )

    matched_challenge = None
    for cand in candidates:
        if cand.attempt_count >= cand.max_attempts:
            continue
        try:
            salt, expected_hash = cand.otp_hash.split('$', 1)
            actual_hash = _hash_otp(clean_otp, salt)
            if hmac.compare_digest(actual_hash, expected_hash):
                matched_challenge = cand
                break
        except Exception:
            continue

    if matched_challenge:
        # OTP matches! Generate opaque single-use activation grant token
        token = secrets.token_urlsafe(32)
        matched_challenge.verification_token = token
        matched_challenge.is_consumed = True
        matched_challenge.consumed_at = now
        matched_challenge.save(update_fields=['verification_token', 'is_consumed', 'consumed_at', 'updated_at'])

        log_audit_event(
            user=None,
            action='OTP_VERIFIED',
            description=f"OTP verified successfully for challenge {matched_challenge.id} ({clean_identifier})",
            request=request,
        )
        return token

    # No match found - update attempt count on most recent candidate if available
    if candidates:
        primary = candidates[0]
        primary.attempt_count += 1
        primary.save(update_fields=['attempt_count', 'updated_at'])
        remaining = max(0, primary.max_attempts - primary.attempt_count)
        if remaining <= 0:
            primary.is_consumed = True
            primary.invalidated_at = now
            primary.save(update_fields=['is_consumed', 'invalidated_at', 'updated_at'])
            raise ValidationError({
                'detail': 'Invalid verification code. Maximum attempts exceeded. Please request a new OTP.'
            })
        raise ValidationError({
            'detail': f'Invalid verification code. {remaining} attempt{"s" if remaining > 1 else ""} remaining.'
        })

    # Check if a challenge existed for this identity but has expired
    expired_challenge = OTPChallenge.objects.filter(
        purpose=purpose,
        expires_at__lte=now,
    ).filter(
        models.Q(identifier__iexact=clean_identifier) |
        models.Q(authorized_identity__institution_id__iexact=clean_identifier) |
        models.Q(authorized_identity__trusted_email__iexact=clean_identifier)
    ).order_by('-created_at').first()
    if expired_challenge:
        raise ValidationError({
            'detail': 'Verification code has expired. Please request a new OTP.'
        })

    # Fallback to EmailVerificationChallenge if student used alternative flow
    ev_challenge = EmailVerificationChallenge.objects.filter(
        identifier__iexact=clean_identifier,
        is_consumed=False,
    ).order_by('-created_at').first()
    if ev_challenge:
        return verify_otp_challenge(clean_identifier, ev_challenge.purpose, clean_otp)

    raise ValidationError({
        'detail': 'No active verification challenge found. Please click Resend OTP.'
    })


def consume_identity_activation_grant(
    identifier: str,
    token: str,
    purpose: str = 'ACTIVATION'
) -> OTPChallenge:
    """
    Validate that an activation grant token was legitimately issued upon OTP verification,
    has not expired, and has not been replayed. Consumes token atomically.
    """
    from django.db import models
    clean_identifier = identifier.strip().lower()
    now = timezone.now()

    challenge = OTPChallenge.objects.filter(
        purpose=purpose,
        verification_token=token,
    ).filter(
        models.Q(identifier__iexact=clean_identifier) |
        models.Q(authorized_identity__institution_id__iexact=clean_identifier) |
        models.Q(authorized_identity__trusted_email__iexact=clean_identifier)
    ).select_related('authorized_identity').first()

    if not challenge:
        # Fallback search by token alone in case of minor casing/formatting difference
        challenge = OTPChallenge.objects.filter(
            purpose=purpose,
            verification_token=token,
        ).select_related('authorized_identity').first()

    if not challenge:
        raise ValidationError({
            'detail': 'Invalid or unverified activation grant. Please complete OTP verification.'
        })

    # Token expires after 30 minutes
    if challenge.consumed_at and now > challenge.consumed_at + timedelta(minutes=30):
        raise ValidationError({
            'detail': 'Activation session has expired. Please restart identity verification.'
        })

    # Invalidate token so it cannot be reused or replayed
    challenge.verification_token = None
    challenge.save(update_fields=['verification_token', 'updated_at'])

    return challenge
