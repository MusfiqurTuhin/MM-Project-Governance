from datetime import date
from enum import Enum
from typing import List, Optional
from sqlmodel import Field, Relationship, SQLModel


class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True)
    hashed_password: str
    role: UserRole = Field(default=UserRole.ADMIN)
    is_active: bool = Field(default=True)

class RAGStatus(str, Enum):
    RED = "RED"
    AMBER = "AMBER"
    GREEN = "GREEN"

class BlockerType(str, Enum):
    TECHNICAL = "TECHNICAL"
    BUREAUCRACY = "BUREAUCRACY"
    CLIENT = "CLIENT"
    RESOURCE = "RESOURCE"
    NONE = "NONE"

class InvoiceStatus(str, Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    PAID = "PAID"

class Client(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    contact_email: str
    projects: List["Project"] = Relationship(back_populates="client")

class Employee(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    roles: str  # Comma separated roles
    updates: List["MeetingUpdate"] = Relationship(back_populates="action_owner")
    managed_projects: List["Project"] = Relationship(back_populates="manager")

class Project(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    client_id: int = Field(foreign_key="client.id")
    manager_id: int = Field(foreign_key="employee.id")
    budget: float
    currency: str = Field(default="USD")
    start_date: date
    original_deadline: date
    
    client: Client = Relationship(back_populates="projects")
    manager: Employee = Relationship(back_populates="managed_projects")
    updates: List["MeetingUpdate"] = Relationship(back_populates="project")
    invoices: List["Invoice"] = Relationship(back_populates="project")

class MeetingUpdate(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id")
    updated_at: date = Field(default_factory=date.today)
    rag_status: RAGStatus
    current_estimated_deadline: date
    blocker_type: BlockerType = Field(default=BlockerType.NONE)
    action_owner_id: int = Field(foreign_key="employee.id")
    next_invoice_amount: float = Field(default=0.0)
    notes: str
    
    project: Project = Relationship(back_populates="updates")
    action_owner: Employee = Relationship(back_populates="updates")

class Invoice(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id")
    amount: float
    status: InvoiceStatus
    due_date: date
    
    project: Project = Relationship(back_populates="invoices")
