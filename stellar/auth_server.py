import os
import getpass
from fastapi import FastAPI, Request, Body
from stellar_sdk import Keypair, TransactionBuilder, Network, Account, TransactionEnvelope
import uvicorn

app = FastAPI()

# --- INITIALIZATION ---
print("--- ZSOZSO SEP-10 AUTH SERVER ---")
# Securely prompt for the Secret Key (it won't echo to the terminal)
SIGNING_SECRET = getpass.getpass(prompt='Enter Secret Key for YOUR ACC...: ')
JWT_SECRET = getpass.getpass(prompt='Enter the JWT secret...: ')

try:
    SERVER_KP = Keypair.from_secret(SIGNING_SECRET)
    print(f"Server started with Public Key: {SERVER_KP.public_key}")
except Exception as e:
    print(f"Invalid Secret Key: {e}")
    exit(1)

SERVER_NAME = "zsozso.info"
NETWORK_PASSPHRASE = Network.PUBLIC_NETWORK_PASSPHRASE

@app.get("/auth")
async def get_auth(account: str):
    try:
        source_account = Account(SERVER_KP.public_key, sequence=-1)
        
        builder = TransactionBuilder(
            source_account=source_account,
            network_passphrase=NETWORK_PASSPHRASE,
            base_fee=100
        )
        builder.set_timeout(300)
        
        builder.append_manage_data_op(
            data_name=f"{SERVER_NAME} auth",
            data_value=os.urandom(32),
            source=account 
        )
        
        tx = builder.build()
        tx.sign(SERVER_KP)
        
        return {"transaction": tx.to_xdr()}
    except Exception as e:
        return {"error": str(e)}

@app.post("/auth")
async def post_auth(transaction: str = Body(..., embed=True)):
    try:
        envelop = TransactionEnvelope.from_xdr(transaction, NETWORK_PASSPHRASE)
        tx = envelop.transaction

        client_address = tx.operations[0].source
        
        envelop.verify(client_address)
        
        envelop.verify(SERVER_KP.public_key)

        token_payload = {
            "iss": f"https://{SERVER_NAME}/auth",
            "sub": client_address,
            "iat": int(time.time()),
            "exp": int(time.time()) + 3600,
        }
        
        token = jwt.encode(token_payload, JWT_SECRET, algorithm="HS256")

        return {"token": token}

    except Exception as e:
        return {"error": f"Authentication failed: {str(e)}"}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
