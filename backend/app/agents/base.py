from dataclasses import dataclass
from enum import StrEnum


class AgentName(StrEnum):
    monitoring = "Monitoring Agent"
    change_intelligence = "Change Intelligence Agent"
    diagnostic = "Diagnostic Agent"
    knowledge = "Knowledge Agent"
    incident_time_machine = "Incident Time Machine Agent"
    remediation = "Remediation Agent"
    validation = "Validation Agent"
    communication = "Communication Agent"


@dataclass(frozen=True)
class AgentStep:
    agent: AgentName
    message: str
    step_type: str = "analysis"
