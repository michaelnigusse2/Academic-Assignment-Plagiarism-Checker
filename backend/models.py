from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    assignments = relationship("Assignment", back_populates="student")

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    filename = Column(String, nullable=False)
    original_text = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="assignments")
    analysis_result = relationship("AnalysisResult", back_populates="assignment", uselist=False)

    topic = Column(String, nullable=True)
    academic_level = Column(String, nullable=True)
    plagiarism_score = Column(Float, nullable=True)
    research_suggestions = Column(JSON, nullable=True)


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    plagiarism_score = Column(Integer, nullable=True)
    analyzed_at = Column(DateTime, default=datetime.utcnow)

    assignment = relationship("Assignment", back_populates="analysis_result")

from pgvector.sqlalchemy import Vector

class AcademicSource(Base):
    __tablename__ = "academic_sources"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(Vector(768)) # nomic-embed-text uses 768 dimensions
