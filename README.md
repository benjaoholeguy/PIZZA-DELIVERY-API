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
  - Email validation have been done with trumail API (https://trumail.io/)

# Operating Instructions
- git clone https://github.com/benjaoholeguy/PIZZA-DELIVERY-API.git
- cd your_path/PIZZA-DELIVERY-API
- node index.js

# Tech Stack
- node

# To test the application:
- node index.js run the application on port 3000 and 3001 (default)
- NODE_ENV=production node index.js run the application on ports 5000 & 5001
- localhost:3000/hello response is hello handler

# To run in debug mode:
