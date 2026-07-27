export const recommendations = [
  {
    title: "Guardian alert near your afternoon route",
    body: "A severe weather alert may affect travel to your 4:00 PM meeting. MyAgent can draft a delay note and suggest a safer departure window.",
    confidence: 82,
    risk: "Low",
    status: "Guardian passed"
  },
  {
    title: "Client reschedule request needs approval",
    body: "The email asks to move tomorrow's strategy call. Calendar shows two better windows and Memory marks this client as high priority.",
    confidence: 76,
    risk: "Medium",
    status: "Approval required"
  }
];

export const connectors = [
  { name: "Gmail", status: "Mock connected", detail: "Email context and drafts" },
  { name: "Google Calendar", status: "Mock connected", detail: "Meetings, conflicts, travel windows" },
  { name: "LinkedIn", status: "Career source", detail: "Profile, roles, and career signals for job recommendations" },
  { name: "CV / Resume", status: "Upload planned", detail: "Skills, education, achievements, and experience" },
  { name: "GitHub", status: "Career source", detail: "Projects, code activity, and proof-of-work" },
  { name: "Weather Alerts", status: "Ready", detail: "City-level Guardian safety alerts" },
  { name: "Emergency Alerts", status: "Ready", detail: "Nearby public safety events" }
];

export const activity = [
  "Context Agent identified profile, goals, field, and preferences",
  "Specialist Agent classified the event as work, career, or nearby safety",
  "Memory Agent checked goals, skills, contacts, and previous decisions",
  "Growth Agent checked whether the event affects jobs or study direction",
  "Planning Agent merged agent outputs into one recommendation",
  "Action Agent converted the plan into draft actions",
  "Guardian Agent reviewed the full trace before anything reached the user"
];

export const collaboration = [
  {
    agent: "Context Agent",
    dependsOn: "Starts first",
    output: "User identity, life stage, field, goals, notification preferences"
  },
  {
    agent: "Specialist Agent",
    dependsOn: "Context Agent",
    output: "Routes event to Email, Location, Career, Calendar, or Intake handling"
  },
  {
    agent: "Memory Agent",
    dependsOn: "Context Agent + Specialist Agent",
    output: "Finds related goals, projects, contacts, skills, and past decisions"
  },
  {
    agent: "Growth Agent",
    dependsOn: "Context Agent + Memory Agent",
    output: "Checks job, study, CV, GitHub, and skill-improvement relevance"
  },
  {
    agent: "Planning Agent",
    dependsOn: "Specialist + Memory + Growth",
    output: "Creates one clear recommendation instead of noisy notifications"
  },
  {
    agent: "Action Agent",
    dependsOn: "Planning Agent",
    output: "Creates drafts, suggestions, calendar changes, or job next steps"
  },
  {
    agent: "Guardian Agent",
    dependsOn: "Action Agent + full trace",
    output: "Allows, blocks, or requires approval based on safety and privacy"
  }
];

export const memory = [
  { category: "Goal", title: "Win hackathon with MyAgent", body: "Prioritize demo clarity, Guardian safety, and approval workflow." },
  { category: "Preference", title: "Notifications", body: "Only interrupt for urgent work or nearby safety issues." },
  { category: "Context", title: "Location mode", body: "Use city-level monitoring first, live location later as opt-in." }
];

export const growth = {
  profile: {
    track: "Student or early-career builder",
    field: "AI software engineering",
    target: "Full-stack AI engineer"
  },
  studies: [
    {
      title: "AI-assisted development is becoming a core software engineering skill",
      detail: "MyAgent will track fresh research and reports in your field, then summarize what matters for your career."
    },
    {
      title: "Employers are shifting toward proof-of-work portfolios",
      detail: "The agent should recommend projects, demos, and measurable outcomes you can show."
    }
  ],
  jobs: [
    {
      title: "Junior AI Full-Stack Engineer",
      match: "Strong match if you build MyAgent into a working demo with auth, agents, memory, and connectors."
    },
    {
      title: "AI Product Engineer Intern",
      match: "Good match for students who can ship useful AI workflows and explain product safety."
    }
  ],
  improvements: [
    "Build one polished AI project with a live demo",
    "Learn OAuth deeply enough to explain Gmail, Calendar, and Drive integrations",
    "Create a portfolio page with architecture, screenshots, and a short demo video",
    "Practice system design for agent memory, tool use, and approval flows"
  ]
};
