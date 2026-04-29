import os
import traceback
import getpass
import jwt
import base64
from fastapi import FastAPI, Request, Body, Query, Response
from fastapi.responses import JSONResponse
from stellar_sdk import Keypair, TransactionBuilder, Network, Account, TransactionEnvelope, TimeBounds
import time
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

def self_verify(public_key, tx_hash, decorated_sig):
    try:
        kp = Keypair.from_public_key(public_key)
        kp.verify(tx_hash, decorated_sig.signature)
        return True
    except:
        return False

@app.get("/auth")
async def get_auth(account: str = Query(None)):
    if not account:
        return JSONResponse(status_code=400, content={"error": "Missing parameter."})
    try:
        Keypair.from_public_key(account)
    except:
        return JSONResponse(status_code=400, content={"error": "Invalid account format"})
        
    try:
        builder = TransactionBuilder(
            source_account=Account(SERVER_KP.public_key, -1),
            network_passphrase=NETWORK_PASSPHRASE,
            base_fee=100,
        )
        now = int(time.time())
        builder.add_time_bounds(now, now + 900)
        
        builder.append_manage_data_op(
            data_name=f"{SERVER_NAME} auth",
            data_value=base64.b64encode(os.urandom(48)),
            source=account
        )
        
        builder.append_manage_data_op(
            data_name="web_auth_domain",
            data_value=SERVER_NAME,
            source=SERVER_KP.public_key
        )
        
        tx = builder.build()
        tx.sign(SERVER_KP)
        
        return {"transaction": tx.to_xdr()}
        
    except Exception as e:
        print(f"Hiba a tranzakció generálásakor: {e}")
        traceback.print_exc()
        return JSONResponse(
            status_code=400,
            content={"error": f"Invalid request: {str(e)}"}
        )

@app.post("/auth")
async def post_auth(request: Request):
    try:
        print("1. Handle different Content-Types.")
        content_type = request.headers.get("Content-Type", "")
        
        if "application/json" in content_type:
            try:
                body = await request.json()
            except:
                return JSONResponse(status_code=400, content={"error": "Invalid JSON"})
        else:
            print("   - Handle application/x-www-form-urlencoded...")
            form_data = await request.form()
            body = dict(form_data)
        
        print("2. Ensure transaction is a string, not a dict or list.")
        transaction = body.get("transaction")
        
        print("3. If 'transaction' itself is a dict (e.g. from a weird JSON structure), we extract the value. If it's already a string, we leave it.")
        if isinstance(transaction, dict):
            transaction = transaction.get("transaction")
        
        if not transaction or not isinstance(transaction, str):
            return JSONResponse(status_code=400, content={"error": "Invalid transaction format"})
        
        print("4. Now 'transaction' is guaranteed to be a string.")
        envelop = TransactionEnvelope.from_xdr(transaction, NETWORK_PASSPHRASE)
        tx_hash = envelop.hash()
        
        print("5a. Smarter client address extraction.")
        client_address = None
        auth_op_name = f"{SERVER_NAME} auth"
        
        for op in envelop.transaction.operations:
            print("    - Check if this is the ManageData operation we created in GET.")
            if hasattr(op, 'data_name') and op.data_name == auth_op_name:
                client_address_obj = op.source
                break
        
        print("5b. Fallback to first op source if the loop didn't find the specific name.")
        if not client_address_obj:
            client_address_obj = envelop.transaction.operations.source
        
        print("5c. We take the classic G... address from the object.")
        if hasattr(client_address_obj, 'account_id'):
            client_address = client_address_obj.account_id
        else:
            client_address = str(client_address_obj)
        
        if not client_address:
            return JSONResponse(status_code=400, content={"error": "Could not identify client account in transaction"})
        
        print(f"5. Identified Client Address: {client_address}")
        if not client_address:
            return JSONResponse(status_code=400, content={"error": "Client address missing in Op 0"})
        
        tx_hash = envelop.hash()
        client_verified = False
        server_verified = False
        
        print("6. Improved Signature Loop.")
        client_sig_count = 0
        server_verified = False
        
        for sig in envelop.signatures:
            print("    - Check Server Signature.")
            is_server = False
            try:
                SERVER_KP.verify(tx_hash, sig.signature)
                if not server_verified:
                    server_verified = True
                    print("    [OK] Server signature found.")
                is_server = True
            except: pass
            
            print("    - Check Client Signature (Check even if server was found for this sig)")
            try:
                Keypair.from_public_key(client_address).verify(tx_hash, sig.signature)
                client_sig_count += 1
                print(f"    [OK] Client signature {client_sig_count} found.")
            except: pass
        
        # SEP-10 Security Check:
        # Fails if the challenge has extra signatures (more than 1 from client + 1 from server)
        # Total signatures should usually be exactly 2 for a simple auth.
        total_sigs = len(envelop.signatures)
        
        print(f"7. Results - Client Sigs: {client_sig_count}, Server: {server_verified}, Total: {total_sigs}")
        
        if client_sig_count != 1:
             return JSONResponse(status_code=400, content={"error": "Challenge must have exactly one client signature"})
        if not server_verified:
             return JSONResponse(status_code=400, content={"error": "Server signature missing"})
        if total_sigs > 2:
             return JSONResponse(status_code=400, content={"error": "Extra unrecognized signatures detected"})
        
        print("8. Success -> Issue JWT.")
        now = int(time.time())
        token_payload = {
            "iss": f"https://{SERVER_NAME}/auth",
            "sub": client_address,
            "iat": now,
            "exp": now + 3600 * 24,
            "jti": os.urandom(16).hex(),
        }
        token = jwt.encode(token_payload, JWT_SECRET, algorithm="HS256")
        return {"token": token}
        
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=400, content={"error": str(e)})
        
if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
