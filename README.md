# Academic Assignment Helper

## How to Run
1. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
2. Start the services:
   ```bash
   docker-compose up --build
   ```

## API Endpoints
- `POST /auth/register`: Register a new student.
- `POST /auth/login`: Login to get a JWT token.
- `POST /upload`: Upload a PDF assignment (requires Auth).

## Authentication Flow
1. **Register** a user.
2. **Login** with credentials to receive an `access_token`.
3. Include the token in the `Authorization` header for protected routes:
   ```
   Authorization: Bearer <your_token>
   ```
