from fastapi import FastAPI

app = FastAPI()

uuid_dict = {
    1: "Julian",
    2: "Grace",
    3: "Zach",
}

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.get("/home/{uuid}")
async def home(uuid: int=None):
    if uuid:
        if not isinstance(uuid, int):
            uuid = int(uuid)
        message = f"Welcome Home: {uuid_dict[uuid]}"
    else:
        message = f"Welcome Home: Anonymous"

    return message

