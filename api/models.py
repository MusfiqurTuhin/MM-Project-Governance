import enum
from datetime import date
from sqlalchemy import Column, Integer, String, Float, Boolean, Date, Enum, ForeignKey
from database import Base


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"


class RAGStatus(str, enum.Enum):
    RED = "RED"
    AMBER = "AMBER"
    GREEN = "GREEN"


class BlockerType(str, enum.Enum):
    TECHNICAL = "TECHNICAL"
    BUREAUCRACY = "BUREAUCRACY"
    CLIENT = "CLIENT"
    RESOURCE = "RESOURCE"
    NONE = "NONE"


class InvoiceStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    PAID = "PAID"


class User(Base):
    __tablename__ = "user"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.ADMIN, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


class Client(Base):
    __tablename__ = "client"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    website = Column(String, nullable=False, default="")


class Employee(Base):
    __tablename__ = "employee"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    roles = Column(String, nullable=False)


class Project(Base):
    __tablename__ = "project"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    client_id = Column(Integer, ForeignKey("client.id"), nullable=False)
    manager_id = Column(Integer, ForeignKey("employee.id"), nullable=False)
    budget = Column(Float, nullable=False)
    currency = Column(String, default="USD")
    start_date = Column(Date, nullable=False)
    original_deadline = Column(Date, nullable=False)
    pocs = Column(String, default="[]")  # JSON array: [{name,designation,phone,email}]


class MeetingUpdate(Base):
    __tablename__ = "meetingupdate"
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("project.id"), nullable=False)
    updated_at = Column(Date, default=date.today, nullable=False)
    rag_status = Column(Enum(RAGStatus), nullable=False)
    current_estimated_deadline = Column(Date, nullable=False)
    blocker_type = Column(Enum(BlockerType), default=BlockerType.NONE)
    action_owner_id = Column(Integer, ForeignKey("employee.id"), nullable=False)
    next_invoice_amount = Column(Float, default=0.0)
    notes = Column(String, nullable=False)


class Invoice(Base):
    __tablename__ = "invoice"
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("project.id"), nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(Enum(InvoiceStatus), nullable=False)
    due_date = Column(Date, nullable=False)


class EditHistory(Base):
    __tablename__ = "edithistory"
    id = Column(Integer, primary_key=True)
    entity_type = Column(String, nullable=False)   # 'project' | 'client' | 'employee'
    entity_id = Column(Integer, nullable=False)
    edited_by = Column(String, nullable=False)
    edited_at = Column(Date, default=date.today, nullable=False)
    snapshot = Column(String, nullable=False)       # JSON of the record after edit
