Milestone Project
Full Stack Deployment & DevOps Engineering
Smart Hostel Complaint & Maintenance
Management System
1. Project Title
HostelOps: Production Deployment of a Containerized Complaint Management
System
2. Background & Context
Many college hostels still rely on manual registers or informal communication to manage
maintenance complaints. This results in delayed responses, lack of tracking, and poor
accountability.
The institution intends to implement a centralized digital platform that enables structured
complaint tracking and administrative oversight.
Students are appointed as DevOps Engineers responsible for deploying this system in a
production-like environment using containerization and reverse proxy configuration.
3. Project Objective
The objective of this capstone is to:
● Deploy a functional full-stack complaint management system
● Containerize application components
● Configure reverse proxy routing
● Secure network exposure
● Demonstrate production-ready practices
● Document deployment architecture
4. Functional Scope
Student Module
● Register / Login
● Submit complaint (category + description + priority)
● View complaint status
Admin Module
● View all complaints
● Update complaint status
● Filter complaints by category or status
Note : No advanced UI, payment integration, notifications, or complex analytics are required.
5. Mandatory Deployment Requirements
5.1 Containerization (Compulsory)
Deployment must be performed using:
● Docker
Requirements:
● Backend must run inside a container
● Frontend must be production-built and deployed via container or reverse proxy
● Environment variables must be externally configured
● Containers must expose only required ports
● Application must be restart-safe
5.2 Reverse Proxy Configuration (Compulsory)
Students must configure:
● Nginx
Requirements:
● Public access must occur via Port 80
● Reverse proxy must route API traffic correctly
● Proper server block configuration required
● Clear explanation of request flow mandatory
(Client → Nginx → Backend Container → Database)
5.3 Networking & Security
Students must:
● Configure firewall rules
● Open only essential ports
● Explain port binding strategy
● Demonstrate understanding of internal vs external service exposure
5.4 Production Readiness Expectations
The deployed system must demonstrate:
● Clean container lifecycle management
● Proper logging visibility
● Crash resilience
● Environment-based configuration
● Structured documentation
6. Deliverables
Each team/student must submit:
1. Running Deployed Application (Docker-based execution mandatory)
2. Architecture Diagram (Container + Reverse Proxy + Port Flow)
3. Nginx Configuration Explanation
4. Dockerfile and Container Explanation
5. Networking & Firewall Strategy
6. Request Lifecycle Explanation
7. Short Serverful vs Serverless Comparison (Conceptual)
7. Evaluation Weightage
Component Weightage
Application Functionality 30%
Docker Implementation 20%
Nginx Reverse Proxy 20%
Networking & Security 10%
Architecture Documentation 20%
