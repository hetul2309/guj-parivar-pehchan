import pytest
from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.core.db import Base
from backend.app.core.models import Person, Family, FamilyMember, Relationship
from backend.app.modules.family.router import calculate_age

def test_family_tree_and_life_events():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    # 1. 3-Generation Family Tree
    p_grandpa = Person(person_id="p1", name_en="Kanubhai Patel", name_gu="કાનુભાઈ પટેલ", dob=date(1940, 1, 1), gender="M")
    p_father = Person(person_id="p2", name_en="Rameshbhai Patel", name_gu="રમેશભાઈ પટેલ", dob=date(1965, 1, 1), gender="M")
    p_son = Person(person_id="p3", name_en="Maheshbhai Patel", name_gu="મહેશભાઈ પટેલ", dob=date(1995, 1, 1), gender="M")

    db.add_all([p_grandpa, p_father, p_son])
    db.flush()

    db.add(Relationship(from_person="p1", to_person="p2", type="parent_of"))
    db.add(Relationship(from_person="p2", to_person="p3", type="parent_of"))
    db.commit()

    rel_count = db.query(Relationship).count()
    assert rel_count == 2

    # 2. Year-only age calculation
    age, approx = calculate_age(date(1964, 1, 1), "year_only")
    assert approx is True
    assert age >= 60
