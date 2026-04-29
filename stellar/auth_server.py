import os
import getpass
from fastapi import FastAPI, Request
from stellar_sdk import Keypair, TransactionBuilder, Network, Server
import uvicorn

app = FastAPI()

# --- INITIALIZATION ---
print("--- ZSOZSO SEP-10 AUTH SERVER ---")
# Securely prompt for the Secret Key (it won't echo to the terminal)
SIGNING_SECRET = getpass.getpass(prompt='Enter Secret Key for YOUR OLD ACC...: ')

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
    """
    SEP-10 Challenge Request
    """
    try:
        # Build the challenge
        builder = TransactionBuilder(
            source_account=SERVER_KP.public_key,
            network_passphrase=NETWORK_PASSPHRASE,
            base_fee=100
        )
        builder.set_timeout(300)

        # Add Manage Data op (SEP-10 standard)
        # Source must be the CLIENT account
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

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
