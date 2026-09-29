# Authentication Pages

Authentication pages handle the different stages of user authentication and account access.

## Forgot Password

Allows users to request a password reset by providing their registered email address. A password reset link is then sent to their email.

## Reset Password

Allows users to set a new password using the password reset link received by email. The reset link contains the required reset credentials and is validated when the password reset request is submitted. If the reset link has expired or is invalid, the user is redirected to the Forgot Password page to request a new reset link.

## Login

Allows users to authenticate using their email address and password. After successful authentication, the user's account information is retrieved and their account type is validated. An OTP is then sent to the user's email, and the user is redirected to the Two-Factor Authentication page to complete verification. If authentication fails, the appropriate error message is displayed.

## Two-Factor Authentication

Allows users to verify their identity using the OTP sent to their email address after successful login. The user enters the six-digit OTP, which is validated before access to the application is granted. Users can also request a new OTP, subject to the resend cooldown period. If verification fails, the appropriate error message is displayed.

## Finalize Account

Allows users who have not yet finalized their account to set a new password and accept the SmartPack terms and conditions before accessing the dashboard. Users are redirected to this page when account finalization is required. After successfully changing their password and accepting the terms and conditions, the user's account information is refreshed and they are redirected to the dashboard.
