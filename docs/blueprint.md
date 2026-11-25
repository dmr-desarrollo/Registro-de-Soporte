# **App Name**: Tech Support Tracker

## Core Features:

- Secure Authentication: User authentication and authorization, including login, logout, password reset, and user roles (admin, technician).
- Dashboard Overview: Dashboard to display key metrics such as total tickets, resolved tickets, and technician performance.
- Ticket Management: Form to submit and track tickets, capturing customer details, equipment information, problem description, and resolution steps.
- Ticket Grid View: Display tickets in a searchable and filterable table with columns for status, technician, and resolution time.
- AI-Powered Case Suggestion: Generate a summary of past tickets involving similar hardware/software configurations; the LLM will use its tool to decide whether those older cases are relevant to the new case, or not.
- Unique code assignment: Code autoincrement

## Style Guidelines:

- Primary color: Deep sky blue (#00BFFF), conveying trust and competence.
- Background color: Light gray (#E0E0E0) for a clean and professional look.
- Accent color: Turquoise (#40E0D0) to highlight key actions and interactive elements.
- Font: 'Inter', a sans-serif (modern and neutral) for headings and body text. Note: currently only Google Fonts are supported.
- Use simple, clear icons from a library like FontAwesome to represent different ticket statuses and actions.
- Use a grid-based layout with clear sections for navigation, dashboards, and ticket management to promote ease of use.
- Incorporate subtle transition animations and loading indicators to enhance user experience and provide feedback.