# Frontend Environment Variables

This document describes the environment variables required for the FeedOps Dashboard frontend application.

## Required Environment Variables

### API Configuration
- `VITE_API_BACKEND_HOST`: The hostname of your backend API server
  - Example: `your-api-server.com` or `127.0.0.1`

### Navigation Section Visibility
These variables control which sections appear in the navigation bar. Set to `true` to enable, `false` to disable.

- `VITE_ENABLE_COMPONENT_DB`: Enable Component Database section
- `VITE_ENABLE_PIPELINES`: Enable Pipelines section
- `VITE_ENABLE_SERVER_DETAILS`: Enable Server Details section
- `VITE_ENABLE_COMPONENT_WATCHER`: Enable Component Watcher section  
- `VITE_ENABLE_COMPONENT_MAP`: Enable Component Map section
- `VITE_ENABLE_EC2_SCHEDULES`: Enable EC2 Schedules section
- `VITE_ENABLE_INFRASTRUCTURE_DETAILS`: Enable Infrastructure Details section
- `VITE_ENABLE_ROUTE53_STATUS`: Enable Route 53 Status section
- `VITE_ENABLE_SERVER_HANDLER`: Enable Server Handler section

## Example .env File

```env
# API Configuration
VITE_API_BACKEND_HOST=your-api-host.com

# Navigation Section Visibility
VITE_ENABLE_COMPONENT_DB=true
VITE_ENABLE_PIPELINES=true
VITE_ENABLE_SERVER_DETAILS=true
VITE_ENABLE_COMPONENT_WATCHER=true
VITE_ENABLE_COMPONENT_MAP=true
VITE_ENABLE_EC2_SCHEDULES=true
VITE_ENABLE_EC2_DETAILS=true
VITE_ENABLE_ROUTE53_STATUS=true
VITE_ENABLE_SERVER_HANDLER=true
```

## GitLab CI/CD Setup

To use these variables in GitLab CI/CD:

1. Go to your GitLab project → Settings → CI/CD → Variables
2. Add a variable named `ENV_FILE` with the content of your .env file
3. Make sure all variables are prefixed with `VITE_` to be accessible in the Vite build process

## Troubleshooting

If no navigation items appear:
1. Check that all `VITE_ENABLE_*` variables are set to `true`
2. Verify that `VITE_API_BACKEND_HOST` is correctly set
3. Check the browser console for any JavaScript errors
4. Ensure the .env file is being created during the build process
