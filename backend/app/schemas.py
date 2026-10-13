from pydantic import BaseModel, Field


class ModeRequest(BaseModel):
    mode: str = Field(pattern="^(simulator|hardware)$")


class SerialRequest(BaseModel):
    port: str = Field(min_length=1, max_length=200)


class CommandRequest(BaseModel):
    command: str = Field(min_length=1, max_length=60)
    source: str = Field(default="manual", max_length=30)


class ListenRequest(BaseModel):
    enabled: bool
    device: int | None = None


class FingerRequest(BaseModel):
    finger: str = Field(pattern="^(thumb|index|middle|ring|pinky)$")
    angle: int = Field(ge=0, le=180)


class GestureUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    command: str = Field(pattern="^[A-Z][A-Z0-9_]*$")
    description: str = Field(default="", max_length=160)
    phrases: list[str] = Field(min_length=1, max_length=20)
    fingers: dict[str, int]
