# Archetype Quiz Logic Explained

## 🎯 The Core Concept

The quiz identifies a teacher's **teaching style and approach** by analyzing their preferences, motivations, and behaviors. Each answer reveals which archetype(s) the teacher aligns with.

## 📊 How Scoring Works

### The 6 Archetypes
1. **Leader** - Structured, organized, takes charge
2. **Innovator** - Creative, tech-forward, experimental
3. **Mentor** - Individual support, relationship-focused
4. **Advocate** - Equity-focused, systemic thinking
5. **Collaborator** - Team-oriented, consensus-building
6. **Specialist** - Content-deep, standards-focused

### Scoring System
- Each answer option has scores (0-3 points) for each archetype
- **3 points** = Strong alignment with that archetype
- **2 points** = Moderate alignment
- **1 point** = Some alignment
- **0 points** = No alignment

### Example: Question 1 - "When planning a new unit, what excites you most?"

**Option 1:** "Creating a detailed, step-by-step lesson plan with clear objectives"
- `leader: 3` - Strong Leader trait (organization, structure)
- `specialist: 2` - Moderate Specialist trait (standards-focused)
- `mentor: 1` - Some Mentor trait (planning for students)
- Others: 0

**Option 2:** "Experimenting with new technology or teaching methods"
- `innovator: 3` - Strong Innovator trait (experimentation)
- `collaborator: 1` - Some Collaborator trait (sharing ideas)
- Others: 0

**Option 3:** "Thinking about how to support each individual student's needs"
- `mentor: 3` - Strong Mentor trait (individual support)
- `advocate: 2` - Moderate Advocate trait (equity consideration)
- `collaborator: 1` - Some Collaborator trait
- Others: 0

**Option 4:** "Considering how this unit addresses equity and systemic issues"
- `advocate: 3` - Strong Advocate trait (equity focus)
- `collaborator: 1` - Some Collaborator trait
- `mentor: 1` - Some Mentor trait
- Others: 0

## 🧮 Calculation Process

### Step 1: Collect Answers
User answers all 8 questions, selecting one option per question.

### Step 2: Sum Scores
For each archetype, add up all the points from selected answers:

```
Example Calculation:
Question 1: Selected Option 3 → mentor: 3, advocate: 2, collaborator: 1
Question 2: Selected Option 1 → leader: 3, collaborator: 1
Question 3: Selected Option 3 → mentor: 3, advocate: 2, collaborator: 1
Question 4: Selected Option 3 → mentor: 3, advocate: 2, collaborator: 1
Question 5: Selected Option 3 → mentor: 3, advocate: 1, collaborator: 1
Question 6: Selected Option 3 → mentor: 3, advocate: 2
Question 7: Selected Option 3 → mentor: 3, advocate: 1, collaborator: 1
Question 8: Selected Option 3 → mentor: 3, advocate: 2, collaborator: 1

Final Scores:
- mentor: 3+3+3+3+3+3+3+3 = 24 points ⭐ (WINNER)
- advocate: 2+2+2+1+2+2+1+2 = 14 points
- collaborator: 1+1+1+1+1+0+1+1 = 7 points
- leader: 0+3+0+0+0+0+0+0 = 3 points
- innovator: 0 points
- specialist: 0 points

Result: "mentor" → Mapped to "The Guide"
```

### Step 3: Determine Winner
The archetype with the **highest total score** becomes the teacher's archetype.

### Step 4: Map to Display Name
- `mentor` → "The Guide"
- `innovator` → "The Trailblazer"
- `advocate` → "The Changemaker"
- `collaborator` → "The Connector"
- `specialist` → "The Explorer"
- `leader` → "The Leader"

## 🎓 The Psychology Behind Each Question

### Question 1: "When planning a new unit, what excites you most?"
**Purpose:** Reveals primary motivation and planning style
- Structure-focused → Leader/Specialist
- Innovation-focused → Innovator
- Student-focused → Mentor/Advocate

### Question 2: "How do you prefer to work with colleagues?"
**Purpose:** Identifies collaboration style
- Leading → Leader
- Innovating → Innovator
- Supporting → Mentor
- Collaborating → Collaborator

### Question 3: "What motivates you most in your teaching?"
**Purpose:** Core teaching motivation
- Achievement → Specialist/Leader
- Innovation → Innovator
- Individual growth → Mentor
- Equity → Advocate

### Question 4: "How do you handle classroom management?"
**Purpose:** Management approach
- Rules/structure → Leader
- Technology/engagement → Innovator
- Relationships → Mentor
- Student involvement → Collaborator/Advocate

### Question 5: "What is your approach to student assessment?"
**Purpose:** Assessment philosophy
- Standardized → Specialist/Leader
- Alternative methods → Innovator
- Individual growth → Mentor
- Equity-focused → Advocate

### Question 6: "How do you respond to a struggling student?"
**Purpose:** Support approach
- Structured plan → Leader/Specialist
- New strategies → Innovator
- One-on-one time → Mentor
- Systemic approach → Advocate

### Question 7: "What is your ideal professional development experience?"
**Purpose:** Learning preference
- Curriculum/standards → Specialist/Leader
- Technology → Innovator
- Differentiation → Mentor
- Equity training → Advocate

### Question 8: "What is your teaching philosophy?"
**Purpose:** Core beliefs
- Structure/expectations → Leader/Specialist
- Innovation/creativity → Innovator
- Individual support → Mentor
- Equity/empowerment → Advocate

## 🔍 Why This Works

### Multi-Dimensional Analysis
- **8 questions** cover different aspects of teaching
- **Multiple archetypes** can score on each question
- **Cumulative scoring** reveals patterns

### Pattern Recognition
The system identifies:
- **Consistent patterns** across questions
- **Dominant traits** that appear repeatedly
- **Teaching style** based on multiple indicators

### Real-World Application
- **Job Matching:** Schools can find teachers whose archetype aligns with their needs
- **Team Building:** Schools can build diverse teams with complementary archetypes
- **Professional Development:** Teachers can focus on growth areas for their archetype

## 📈 Score Interpretation

### High Score (18-24 points)
Strong alignment with this archetype. This is likely the teacher's primary style.

### Medium Score (10-17 points)
Moderate alignment. Teacher may have traits from this archetype.

### Low Score (0-9 points)
Weak alignment. This archetype is not a primary characteristic.

## 🎯 Example Scenarios

### Scenario 1: The Structured Teacher
Answers favor:
- Detailed planning
- Clear rules
- Standardized assessment
- Structured support

**Result:** High Leader/Specialist scores → "The Leader" or "The Explorer"

### Scenario 2: The Student-Centered Teacher
Answers favor:
- Individual student needs
- One-on-one support
- Growth-focused assessment
- Relationship building

**Result:** High Mentor scores → "The Guide"

### Scenario 3: The Equity-Focused Teacher
Answers favor:
- Systemic issues
- Inclusive practices
- Fair assessment
- Social justice

**Result:** High Advocate scores → "The Changemaker"

## ✅ Why It's Accurate

1. **Multiple Data Points:** 8 questions provide comprehensive view
2. **Weighted Scoring:** Strong traits get 3 points, moderate get 2, weak get 1
3. **Pattern Recognition:** Consistent answers reveal true archetype
4. **Validated Questions:** Each question targets specific teaching dimensions

The system doesn't just ask "what are you?" - it analyzes **how you teach, why you teach, and what you value** to determine your archetype automatically!

