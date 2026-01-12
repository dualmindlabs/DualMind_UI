# Required Backend API Endpoints

## 1. Sync User Endpoint
**POST** `/api/users/sync`

Creates or updates a user in the database from Supabase auth data.

### Request Body:
```json
{
  "id": "user-uuid-from-supabase",
  "email": "user@example.com",
  "phone": "+919876543210",
  "name": "User Name",
  "avatar_url": "https://...",
  "provider": "phone" | "email" | "google"
}
```

### Response:
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "created_at": "2024-01-01T00:00:00Z"
}
```

## 2. Model Vote Endpoint (Already exists but might need fixing)
**POST** `/api/arena/model-vote`

### Request Body:
```json
{
  "comparisonId": "comparison-uuid",
  "voteChoice": "left" | "right" | "tie" | "both-bad",
  "userId": "user-uuid"
}
```

### Response:
```json
{
  "success": true,
  "voteId": "vote-uuid"
}
```

## Implementation Notes:

### For User Sync:
- Check if user exists by UUID
- If not exists, create new user
- If exists, update their info
- This should be called when user first logs in

### For Vote Submission:
- Ensure the comparisonId exists in your comparisons table
- Link the vote to both the comparison and the user
- Return success response

### Database Schema Suggestions:
```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  phone VARCHAR,
  name VARCHAR,
  avatar_url VARCHAR,
  provider VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ensure threads table references users
ALTER TABLE threads 
ADD CONSTRAINT threads_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id);

-- Comparisons table
CREATE TABLE comparisons (
  id UUID PRIMARY KEY,
  prompt TEXT,
  model1_response TEXT,
  model2_response TEXT,
  model1_id UUID,
  model2_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Votes table
CREATE TABLE votes (
  id UUID PRIMARY KEY,
  comparison_id UUID REFERENCES comparisons(id),
  user_id UUID REFERENCES users(id),
  vote_choice VARCHAR, -- 'left', 'right', 'tie', 'both-bad'
  created_at TIMESTAMP DEFAULT NOW()
);
```
