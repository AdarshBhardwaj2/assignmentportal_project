# Assignment Submission Project Documentation

## Introduction

The Assignment Submission Project is a web application designed for students to submit their assignments and for admins to manage submissions. The application uses Node.js, Express.js, and PostgreSQL as the database.

## Prerequisites

we need to have all these installed 

- **Node.js** 
- **npm** 
- **PostgreSQL** 

## Project Setup
   npm init
   initialising the project using "npm init"

## Installing dependencies:

   npm install
   Installing all dependencies like body Parser,pg,ejs etc
  

 ## Database Configuration

    1. Creating the database:
    
       Creating a postgreSQL database named "homework" 
    
    2. Creating tables:

       created table users(id,username,password,role) and assignment(id,user_id,task,admin,status,submission_date)

## Running the Application

To start the server, we run the following command in our terminal:

node index.js

The application will be running on `http://localhost:3000`.



##  Usage

1. Opening the application in our web browser at `http://localhost:3000` 
2. Use the login form to log in as a user or an admin.
3. Admins can manage assignments, and users can submit their assignments.

