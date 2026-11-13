"""
Module: backend/apps/accounts/urls.py

Work / Purpose:
    Configures URL endpoints for login, logout, profile (/me), password management, OTP signup/activation, authorized rosters, and Super Admin actions.

Connected Modules (Used By / Routes):
    - backend/config/urls.py
    - backend/config/urls.py (included under /api/v1/)

Helpful / Supporting Modules (Dependencies):
    - backend/apps/accounts/__init__.py
    - backend/apps/accounts/views.py
    - backend/apps/accounts/views_activation.py
    - backend/apps/accounts/views_super_admin.py
    - django (external library / framework)
    - rest_framework (external library / framework)
    - rest_framework_simplejwt (external library / framework)

Original Module Notes:
    URL routes for authentication and authorized roster management.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from . import views_activation
from . import views_super_admin

router = DefaultRouter()
router.register(r'admin/authorized-students', views.AuthorizedStudentViewSet, basename='admin-authorized-students')
router.register(r'admin/authorized-wardens', views.AuthorizedWardenViewSet, basename='admin-authorized-wardens')
router.register(r'super-admin/authorized-identities', views_super_admin.SuperAdminIdentityViewSet, basename='super-admin-authorized-identities')
router.register(r'super-admin/identities', views_super_admin.SuperAdminIdentityViewSet, basename='super-admin-identities')

urlpatterns = [
    # Core Auth & Session
    path('login/', views.login_view, name='auth-login'),
    path('logout/', views.logout_view, name='auth-logout'),
    path('me/', views.me_view, name='auth-me'),
    path('session/', views.me_view, name='auth-session'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('password/change/', views.change_password_view, name='auth-password-change'),

    # Centralized OTP-Based Account Activation (All Roles)
    path('activation/request-otp/', views_activation.request_activation_otp_view, name='activation-request-otp'),
    path('activation/verify-otp/', views_activation.verify_activation_otp_view, name='activation-verify-otp'),
    path('activation/set-password/', views_activation.set_activation_password_view, name='activation-set-password'),
    path('auth/activation/request-otp/', views_activation.request_activation_otp_view, name='auth-activation-request-otp'),
    path('auth/activation/verify-otp/', views_activation.verify_activation_otp_view, name='auth-activation-verify-otp'),
    path('auth/activation/set-password/', views_activation.set_activation_password_view, name='auth-activation-set-password'),

    # Super Admin Account Controls
    path('super-admin/accounts/<int:pk>/suspend/', views_super_admin.suspend_account_view, name='super-admin-account-suspend'),
    path('super-admin/users/<int:pk>/suspend/', views_super_admin.suspend_account_view, name='super-admin-user-suspend'),
    path('super-admin/accounts/<int:pk>/reactivate/', views_super_admin.reactivate_account_view, name='super-admin-account-reactivate'),
    path('super-admin/users/<int:pk>/reactivate/', views_super_admin.reactivate_account_view, name='super-admin-user-reactivate'),
    path('super-admin/accounts/<int:pk>/revoke/', views_super_admin.revoke_account_view, name='super-admin-account-revoke'),
    path('super-admin/users/<int:pk>/revoke/', views_super_admin.revoke_account_view, name='super-admin-user-revoke'),
    path('super-admin/audit-logs/', views_super_admin.super_admin_audit_logs_view, name='super-admin-audit-logs'),
    path('super-admin/metrics/', views_super_admin.super_admin_metrics_view, name='super-admin-metrics'),

    # Student Registration Flow (OTP + Password)
    path('student/signup/request-otp/', views.student_signup_request_otp_view, name='student-signup-request-otp'),
    path('student/signup/verify-otp/', views.student_signup_verify_otp_view, name='student-signup-verify-otp'),
    path('student/signup/complete/', views.student_signup_complete_view, name='student-signup-complete'),

    # Warden Registration Flow (Dedicated Pre-authorized Flow)
    path('warden/signup/request-otp/', views.warden_signup_request_otp_view, name='warden-signup-request-otp'),
    path('warden/signup/verify-otp/', views.warden_signup_verify_otp_view, name='warden-signup-verify-otp'),
    path('warden/signup/complete/', views.warden_signup_complete_view, name='warden-signup-complete'),

    # Password Reset via 6-digit OTP
    path('password/request-reset/', views.password_reset_otp_request_view, name='auth-password-request-reset'),
    path('password/verify-reset-otp/', views.password_reset_otp_verify_view, name='auth-password-verify-reset-otp'),
    path('password/reset/', views.password_reset_otp_complete_view, name='auth-password-reset-otp-complete'),

    # Legacy link-based reset (preserved for compatibility)
    path('password/reset-link/', views.password_reset_request_view, name='auth-password-reset-link'),
    path('password/reset/confirm/', views.password_reset_confirm_view, name='auth-password-reset-confirm'),

    # Routers
    path('', include(router.urls)),
]
