---
marp: true
theme: uncover
paginate: true
---

# OpenSpec

### A Communication Framework Between Humans and AI

<br>

*A short introduction*

---

# Before we begin

This session is **NOT**:

- ❌ A deep dive into **Spec-Driven Development (SDD)**
- ❌ A detailed guide on how to write "proper" specs
- ❌ A comparison of OpenSpec with other SDD tools

> SDD is just a **consequence** of using OpenSpec, not the main point we want to address.

---

# 🎯 So what is this session about?

### OpenSpec as a **Communication Framework** between humans and AI

---

## The problem: Communicating with AI

When working with an AI coding agent, we often run into:

- 🤔 Not knowing in advance what the AI will do
- 😵 Only realizing it misunderstood after it's finished
- 🔄 Having to redo things over and over
- 📉 Losing control when the task gets complex

→ We need a clear **communication framework**

---

## How does OpenSpec solve this?

A controlled reinforcement loop

```text
   ┌────────┐   propose ┌────┐   gen   ┌───────────┐ ok ┌──────┐   gen   ┌──────────┐ ok  ┌───────┐
   │👤Human │──────────►│🤖AI│────────►│📄Artifacts│───►│🤖 AI │────────►│💻  Code  │────►│✅ Done│
   └───▲────┘           └────┘  spec   │  review   │    └──────┘  code   │  review  │     └───────┘
       │                               └────┬──────┘                     └─────┬────┘
       │                                    │ not ok                           │ not ok
       │          feedback                  │                                  │
       └────────────────────────────────────┴──────────────────────────────────┘
```

→ The loop repeats until the work is done ✅

---

## Why does this matter?

| Without a communication framework | With OpenSpec |
|---|---|
| AI works by "gut feeling" | AI works from clear artifacts |
| Scattered feedback, hard to track | Structured feedback |
| Results are hard to predict | Output can be anticipated up front |
| Everyone does their own thing | The whole team shares one convention |

---

## Standardizing communication across the team

OpenSpec is not just a **human ↔ AI** communication framework, but also a **human ↔ human** one:

- 👥 The whole team uses one shared format → easier to understand each other
- 🔍 A **reviewer** reading the spec/change immediately grasps the ticket author's intent
- 💬 The ticket author doesn't have to re-explain things repeatedly
- 📚 The spec is the **source of truth** for both humans and AI

---

## Applying it to the B2B team

### Mapping OpenSpec to our current Jira workflow

| OpenSpec | Jira |
|---|---|
| **1 change** | **1 Jira ticket** |
| **1 base spec** | **1 user story / epic / module** of the app |

→ No need to change the project management workflow
→ OpenSpec **complements**, it doesn't replace

---

## Recap of the main part

# 🤝

OpenSpec = **Communication Framework**

- Between **humans and AI** (reinforcement loop)
- Between **team members** (standardization)
- Integrates naturally with the B2B **Jira workflow**

---

# Bonus section

### Two skills worth noting: `explore` & `verify`

---

## 🔍 Skill: `explore`

**When to use?**

- Before creating a change, when the idea is still vague
- When you need to "think together" with the AI about a problem

**Its role:**

- The AI is a **thinking partner**, not an executor
- Asks counter-questions, clarifies requirements
- Explores trade-offs before committing to a design

→ Reduces the risk of a wrong spec from the start

---

## ✅ Skill: `verify`

**When to use?**

- After finishing the implementation, before archiving the change
- Before creating a PR / merging

**Its role:**

- Checks whether the implementation matches the artifacts
- Detects gaps between the spec and the code
- Ensures the **coherence** of the change

→ Improves review quality, reduces bugs

---

## The lifecycle of a change with OpenSpec

```
explore ──► new ──► apply ──► verify ──► archive
   │          │       │         │          │
   │          │       │         │          │
  idea  → proposal → code  →  check  → close ticket
```

Every step has a clear **artifact** for humans and AI to reference together.

---

# Thank you 🙏

### Q & A

*All feedback is welcome — this too is a reinforcement loop 😄*
