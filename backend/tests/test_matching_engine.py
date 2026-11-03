"""
Comprehensive tests for graph-based multi-party room exchange matching engine.
Verifies:
- 2-person direct swaps
- 3-person multi-party cycles
- 4-person rotation cycles
- Gender-compatibility pruning
- Bed availability & active status pruning
- Deduplication of equivalent cycles (canonical key)
"""
import pytest
from apps.matching.engine import build_compatibility_graph, find_cycles, run_matching
from apps.exchange_requests.models import ExchangeRequest


@pytest.mark.django_db
class TestMatchingEngine:

    def test_two_way_direct_swap(self, make_student, make_hostel, make_allocation, make_exchange_request):
        """Student 1 (Bed A) wants Bed B, Student 2 (Bed B) wants Bed A."""
        hostel, block, rooms, beds = make_hostel(gender='MALE')
        student1 = make_student(gender='MALE')
        student2 = make_student(gender='MALE')

        bed_a = beds[0]
        bed_b = beds[1]

        make_allocation(student1, bed_a)
        make_allocation(student2, bed_b)

        req1 = make_exchange_request(student1, bed_a)
        req1.preferred_bed = bed_b
        req1.save()

        req2 = make_exchange_request(student2, bed_b)
        req2.preferred_bed = bed_a
        req2.save()

        requests = [req1, req2]
        graph, req_map = build_compatibility_graph(requests)

        assert req2.id in graph[req1.id]
        assert req1.id in graph[req2.id]

        cycles = find_cycles(graph, req_map, max_length=5)
        assert len(cycles) == 1
        assert cycles[0].cycle_length == 2
        req_ids = {r.id for r in cycles[0].requests}
        assert req_ids == {req1.id, req2.id}

    def test_three_way_cycle(self, make_student, make_hostel, make_allocation, make_exchange_request):
        """
        Cycle A -> B -> C -> A:
        Student 1 (Bed A) wants Bed B
        Student 2 (Bed B) wants Bed C
        Student 3 (Bed C) wants Bed A
        """
        hostel, block, rooms, beds = make_hostel(gender='MALE')
        s1 = make_student(gender='MALE')
        s2 = make_student(gender='MALE')
        s3 = make_student(gender='MALE')

        b1, b2, b3 = beds[0], beds[1], beds[2]
        make_allocation(s1, b1)
        make_allocation(s2, b2)
        make_allocation(s3, b3)

        r1 = make_exchange_request(s1, b1)
        r1.preferred_bed = b2
        r1.save()

        r2 = make_exchange_request(s2, b2)
        r2.preferred_bed = b3
        r2.save()

        r3 = make_exchange_request(s3, b3)
        r3.preferred_bed = b1
        r3.save()

        requests = [r1, r2, r3]
        graph, req_map = build_compatibility_graph(requests)
        cycles = find_cycles(graph, req_map, max_length=5)

        assert len(cycles) == 1
        assert cycles[0].cycle_length == 3
        assert {r.id for r in cycles[0].requests} == {r1.id, r2.id, r3.id}

    def test_four_way_cycle(self, make_student, make_hostel, make_allocation, make_exchange_request):
        """
        Cycle 1 -> 2 -> 3 -> 4 -> 1
        """
        hostel, block, rooms, beds = make_hostel(gender='MALE')
        students = [make_student(gender='MALE') for _ in range(4)]
        alloc_beds = beds[:4]

        for s, b in zip(students, alloc_beds):
            make_allocation(s, b)

        requests = []
        for i in range(4):
            req = make_exchange_request(students[i], alloc_beds[i])
            # Desires next bed in cycle
            req.preferred_bed = alloc_beds[(i + 1) % 4]
            req.save()
            requests.append(req)

        graph, req_map = build_compatibility_graph(requests)
        cycles = find_cycles(graph, req_map, max_length=5)

        assert len(cycles) == 1
        assert cycles[0].cycle_length == 4
        assert {r.id for r in cycles[0].requests} == {r.id for r in requests}

    def test_gender_segregation_blocks_incompatible_edge(
        self, make_student, make_hostel, make_allocation, make_exchange_request
    ):
        """
        Male student cannot swap into a Female block.
        """
        h_male, blk_male, _, beds_m = make_hostel(gender='MALE')
        h_fem, blk_fem, _, beds_f = make_hostel(gender='FEMALE')

        male_stud = make_student(gender='MALE')
        fem_stud = make_student(gender='FEMALE')

        b_male = beds_m[0]
        b_fem = beds_f[0]

        make_allocation(male_stud, b_male)
        make_allocation(fem_stud, b_fem)

        r_male = make_exchange_request(male_stud, b_male)
        r_male.preferred_bed = b_fem
        r_male.save()

        r_fem = make_exchange_request(fem_stud, b_fem)
        r_fem.preferred_bed = b_male
        r_fem.save()

        requests = [r_male, r_fem]
        graph, req_map = build_compatibility_graph(requests)

        # Edges should be strictly pruned by gender check
        assert graph[r_male.id] == []
        assert graph[r_fem.id] == []

        cycles = find_cycles(graph, req_map, max_length=5)
        assert len(cycles) == 0

    def test_inactive_bed_is_pruned(
        self, make_student, make_hostel, make_allocation, make_exchange_request
    ):
        """Beds marked inactive or unavailable for exchange should not form edges."""
        hostel, block, rooms, beds = make_hostel(gender='MALE')
        s1 = make_student(gender='MALE')
        s2 = make_student(gender='MALE')

        b1, b2 = beds[0], beds[1]
        b2.is_available_for_exchange = False
        b2.save()

        make_allocation(s1, b1)
        make_allocation(s2, b2)

        r1 = make_exchange_request(s1, b1)
        r1.preferred_bed = b2
        r1.save()

        r2 = make_exchange_request(s2, b2)
        r2.preferred_bed = b1
        r2.save()

        graph, req_map = build_compatibility_graph([r1, r2])
        assert r2.id not in graph[r1.id]
