# Admin security model

The diagram app is served under `/diagram`. Admin tools live at `/diagram/admin`. Authorization is checked on the server for every admin call. Hiding a button is not the control.

## Who is an admin

The `user.role` column is `user` or `admin`. A request is an admin only when the signed-in account has `role = admin` and `disabled = false`.

Three ways an account becomes an admin:

1. Boot seed. If `DESIGN_ADMIN_PASSWORD` is set, an idempotent step creates username `stevenmarr` (email from `DESIGN_ADMIN_EMAIL`, otherwise `stevenmarr@performance-video.local`) with role `admin` and `must_change_password`. If the variable is missing, the step logs that it skipped and does not create or change a user. Once the account exists, later boots do not rotate the password.
2. `ADMIN_EMAILS`. A listed address is promoted to admin on the next admin-page visit.
3. Another admin changes the role in the admin page.

The first sign-in for the seeded admin must set a new password before other server functions will run. Disabled accounts cannot open a new session.

## Passwords and reset

New passwords are bcrypt. Older Better Auth scrypt hashes still verify.

A reset request always returns the same sentence, whether or not the email exists. Tokens are 32 random bytes. Only the SHA-256 hash is stored. A token expires in one hour, a newer request retires unused tokens for that account, and a successful reset marks the token used before the password is changed so it cannot be spent twice. Email and IP are rate limited (5 and 20 per hour). Mail goes out through SMTP when `SMTP_HOST` and a from-address are set, and to the server log otherwise. The link is not returned to the browser.

Signed-in users change their own password from `/diagram/account`, which checks the current password.

## What admins can do

- Search accounts, change role, disable or enable, set a temporary password, email a reset, and delete an account after typing its email.
- Open another person's drawing read-only or editable. Edits are audited.
- Create, edit, and delete global device definitions and per-user library models.
- Browse every public table with filter, sort, pagination, and CSV export.
- Turn on write mode and edit or delete a row after typing `EDIT ROW` or `DELETE ROW`. Password and token columns cannot be edited from the grid.
- Run one SQL statement. Reads need no extra phrase. Writes run only when the phrases are exactly `WRITE` and `CONFIRM WRITE`.

Every admin mutation is appended to `admin_audit`. SQL text stored there has string literals redacted. CSV export and revealing masked columns are audited too.

## What this does not do

The SQL console is an application check, not a separate database role. A bug in the statement classifier would run with the app's database user. A follow-up can add a read-only Postgres role for the console. Until then, admin accounts are equivalent to trusted operators.

Deleting a user removes that user's drawings, library rows, and sessions. It does not remove audit history.
