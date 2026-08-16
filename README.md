# Equipment Request Management System — Frontend

A role-based web application developed as a university group project to manage equipment requests, approvals, issuing, returning, purchasing, inventory, notifications, and reporting.

**My role:** Frontend Developer
**Primary contribution:** React.js frontend, JavaScript, HTML5, CSS3, reusable UI components, API integration, dashboards, and frontend workflow implementation.

## Technologies

React.js

JavaScript (ES6+)

JSX

HTML5

CSS3

React Router

React Context API

Fetch API / REST API integration

React Icons

Recharts

Browser Local Storage

JWT token handling on the frontend

The backend was developed by another team member using Java/Spring Boot. This repository documents my frontend contribution and the frontend's integration with the team's REST APIs.

## Main Features

**Authentication**

Login and student signup interfaces

Password strength and confirmation validation

Forgot/reset password flows

Email verification page

JWT token storage and authenticated API requests

Role-based navigation

## Role-based Interfaces

The frontend contains dedicated interfaces for:

Student

Instructor/Staff

Lecturer

Technical Officer

Head of Department (HOD)

Administrator

## Equipment Request Workflow

Frontend screens support workflows for:

Creating equipment requests

Viewing current requests

Request history

Lecturer approval/rejection

Technical Officer issue/wait/return verification

Student acceptance and return

Purchase request submission and approval

Inventory and laboratory management

## Dashboards and Reporting

Role-specific dashboards

Request statistics

Interactive charts using Recharts

HOD reports

Lab-level reporting

Printable PDF-style HOD lab reports

## Reusable Components

Examples include:

Navbar

Sidebar

Topbar

Notification Bell

Summary Cards

Feedback Modal

Password/reset modals

Signup overlay

## Frontend Architecture

src/
├── api/              # REST API client functions
├── components/       # Reusable React components
├── context/          # Shared application state
├── pages/            # Role-specific pages and workflows
├── styles/            # Page and role-specific CSS
├── utils/             # Reporting/PDF utilities
├── App.jsx            # Application routes
├── main.jsx           # React entry point
└── index.css          # Global styles

## API Integration

The frontend uses a centralized API wrapper to:

Build API requests.

Attach the JWT token when available.

Parse JSON/text responses.

Handle HTTP errors.

Expose grouped API functions for authentication, notifications, student requests, lecturer approvals, Technical Officer workflows, HOD functions, and administration.

The backend API is not included in this frontend-only repository.

## My Contribution

I was responsible primarily for the frontend development. My contribution included:

Implementing React pages and reusable components.

Building role-specific dashboards and navigation.

Implementing frontend forms and validation.

Integrating frontend screens with backend REST endpoints.

Handling JWT tokens and authenticated API requests on the client side.

Building request, approval, issue, return, purchase, inventory, notification, and reporting interfaces.

Implementing interactive data visualizations with Recharts.

Styling the application with CSS and responsive layouts.

Debugging frontend functionality and improving user flows.

## Important Note

This was a university group project. The Spring Boot backend and database were developed by another team member. Backend technologies are mentioned only to describe the system integration, not as my individual implementation.

## Setup

A typical setup after restoring the original configuration is:

npm install
npm run dev

The frontend expects the corresponding backend REST API to be available.
