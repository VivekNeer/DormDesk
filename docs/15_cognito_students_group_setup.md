# Auto-Assigning New Users to Students Group in Cognito

Cognito has **no native "default group" feature**. Use one of these approaches:

---

## Option 1 — Lambda Post-Confirmation Trigger (AWS-native)

Code is already at `lambda/post-confirmation/index.js`.

**Deploy steps (run on EC2):**

```bash
# 1. Create IAM Role in AWS Console first:
#    IAM → Roles → Create Role → Lambda
#    Attach: AmazonCognitoPowerUser + AWSLambdaBasicExecutionRole
#    Name: dormdesk-lambda-role → copy the ARN

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/dormdesk-lambda-role"

cd ~/DormDesk/lambda/post-confirmation
zip function.zip index.js

# 2. Create Lambda
aws lambda create-function \
  --function-name dormdesk-post-confirmation \
  --runtime nodejs18.x \
  --role $ROLE_ARN \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --region ap-south-1

# 3. Allow Cognito to invoke it
aws lambda add-permission \
  --function-name dormdesk-post-confirmation \
  --statement-id cognito-invoke \
  --action lambda:InvokeFunction \
  --principal cognito-idp.amazonaws.com \
  --source-arn arn:aws:cognito-idp:ap-south-1:${ACCOUNT_ID}:userpool/ap-south-1_3nKp38Foj \
  --region ap-south-1

# 4. Attach trigger to Cognito User Pool
aws cognito-idp update-user-pool \
  --user-pool-id ap-south-1_3nKp38Foj \
  --lambda-config PostConfirmation=arn:aws:lambda:ap-south-1:${ACCOUNT_ID}:function:dormdesk-post-confirmation \
  --region ap-south-1
```

---

## Option 2 — Manually add existing users (one-off fix)

For users already in Cognito without a group:

```bash
aws cognito-idp admin-add-user-to-group \
  --user-pool-id ap-south-1_3nKp38Foj \
  --username user@example.com \
  --group-name Students \
  --region ap-south-1
```

---

## Current Status

The app already handles groupless users correctly (code-level fix in `ProtectedRoute.jsx` and `requireStudent.js` — any authenticated non-admin is treated as a student). Lambda is optional but makes the Cognito console cleaner.
