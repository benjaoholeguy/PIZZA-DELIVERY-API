# PIZZA-DELIVERY-API

# Explanation
  - API Implementation for a pizza-delivery company.
  - RESTful JSON API that listens on ports 3000 and 3001 for testing and 5000 and 5001 for production.
  - API allows you to:
    - Create new users (name, email address, street address)
    - Edit their information
    - Delete thier information
    - User could login and logout creating and destroying a token

# Email validation
  - Two validation levels of the email:
    - Empty email field
    - Existence Email validation have been done with trumail API (https://trumail.io/)

# Operating Instructions
- git clone https://github.com/benjaoholeguy/PIZZA-DELIVERY-API.git
- cd your_path/PIZZA-DELIVERY-API
- node index.js

# Tech Stack
- node

# Third-party APIs Used
- Stripe - https://stripe.com
- Trumail - https://trumail.io


---
## RESTful API ENDPOINTS

### ```/pizzas```

##### GET

- Retrieve data for an existing user as JSON.  
- Required fields: (in queryStringObject object) {string}`email`, {numeric}`pizzaId`
- Return: Pizza object
- Requires Token: Yes

### ```/orders```

##### POST

- Register a new json order in orders folder. Make the payment connecting with Stripe API. Delete json cart from carts folder after the payment.   
- Required: (in JSON payload) {string}`orderId`, {string}`email`
- Return: Order object. {string}`orderId`, {string}`paymentId`, {numeric}`amount`, {string}`userEmail`, {Date}`date`
- Requires Token: Yes

### ```/carts```

##### POST

- Register a new json cart in carts folder.   
- Required: (in JSON payload) {Array}`pizzas`, {string}`email`
- Return: Cart object. {string}`cartId`, {Array}`pizzas`, {string}`userEmail`
- Requires Token: Yes

### ```/users```

##### POST

- Create a new user. Each user must have a unique email address.  
- Required: (in JSON payload) {string}`name`, {string}`email`, {string}`address`, {boolean}`tosAgreement`
- Return: User object
- Requires Token: No

##### GET

- Retrieve data for an existing user as JSON.  
- Required fields: (in queryStringObject object) {string}`email`
- Return: User object
- Requires Token: Yes

##### PUT

- Update an existing user.  
- Required: (in JSON payload) `email`  
- Optional: (in JSON payload) `name`, `address`, `tosAgreement` (at least one must be specified)
- Return: User object
- Requires Token: Yes

##### DELETE

- Delete an existing user.  
- Required: (in JSON payload) {string}`email`
- Return: {}  
- Requires Token: Yes

### ```/tokens```

##### POST

- Create user token
- Required fields: (in JSON payload) {String}`email`
- Return: {String}`email`, {String}`id`, {number}`expires`  
- Requires Token: No

##### GET

- Lookup the token for a user.  
- Required: (in queryStringObject object) {String}`id`
- Return: {String}`email`, {String}`id`, {number}`expires`    
- Requires Token: No

##### PUT

- Extend a token for a user.  
- Required: (in JSON payload) {string}`id`, {boolean}`extend`  
- Return: {}
- Requires Token: Yes

##### DELETE

- Remove user token  
- Required fields: (in queryStringObject object) {string}`id`
- Return: {}
- Requires Token: Yes

# Run the API
- node index.js run the application on port 3000 and 3001 (default)
- NODE_ENV=production node index.js run the application on ports 5000 & 5001

# To run in debug mode:
- NODE_DEBUG=/*file to debug*/ node index.js
- EG: NODE_DEBUG=handlers node index.js
- Example: NODE_DEBUG=pizzas node index.js
