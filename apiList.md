#  DevTinder APIs

### authROuter
- POST /singup
- POST /login
- Post /logout

### profileRouter
- GET /profile/view
- PATCH /profile/edit
- PATCH /profile/password

### connectionRequestRouter
- POST /request/send/intrested/:userId
- POST /request/send/ignored/:userID
- POST /request/accept/:required
- POST /request/rejected/:required

### userROuter
- GET /user/connections
- GET /user/requests
- GET /user/feed - Gets you the profiles of other users on platform


Status : ignore, interested, accepted, rejected