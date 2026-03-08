# Production Deployment Guide

## Architecture Overview
The Loan Management System is containerized into a multi-tier stateless architecture:
1. **Frontend:** React application served as static files by `nginx:alpine` (port 80).
2. **Backend:** Flask REST API served by `gunicorn` with 4 asynchronous workers (port 5000).
3. **Database:** Standard MySQL 8 container (port 3306).

## Local Sandbox / Staging
To spin up a complete production-like sandbox locally using Docker Compose:

```bash
docker-compose up --build -d
```
*Note: Make sure to copy `.env.example` in both `my-app` and `backend` to `.env` before running.*

## Cloud Deployment (ECS / Kubernetes)
1. **CI/CD Pipeline:** The included GitHub Actions `.github/workflows/production.yml` automatically builds the React and Flask Docker images upon merge to `main`.
2. **Stateless Scale:** Both the Nginx server and the Gunicorn API nodes are 100% stateless (session tokens are JWTs). You can linearly horizontally scale the backend behind an Application Load Balancer (ALB).
3. **Healthchecks:** Point your Load Balancer's target group health check ping to `/api/health` on port 5000. It performs a lightweight MySQL connection validation.

## Security Hardening
- **Logs:** Logs stream cleanly to stdout/stderr with Flask's structured format for fluentd/Logstash scraping.
- **Headers:** Strict HTTP Security Headers (X-Content-Type-Options, X-Frame-Options, XSS mode block, HSTS) are globally enforced by `app.after_request`.
