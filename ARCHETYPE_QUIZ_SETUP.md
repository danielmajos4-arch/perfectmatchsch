# Archetype Quiz Setup Guide

## 🎯 The Issue
Quiz questions are showing, but answer options are not displaying. This is because the quiz database tables/view may not exist or may not have data.

## ✅ Solution

### Step 1: Run the Database Setup
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `QUIZ_DATABASE_SETUP.sql`
4. Click **Run** to execute

This will create:
- ✅ `archetype_quiz_questions` table (8 questions)
- ✅ `archetype_quiz_options` table (32 options - 4 per question)
- ✅ `quiz_with_options` view (joins questions and options)
- ✅ RLS policies (allows everyone to read quiz data)
- ✅ Sample quiz data (all 8 questions with 4 options each)

### Step 2: Verify Data Was Created
After running the SQL, you should see:
```
Questions: 8
Options: 32
View Rows: 32
```

### Step 3: Test the Quiz
1. Refresh your app
2. Go through teacher onboarding
3. Save your profile
4. You should now see the quiz with answer options!

## 🔍 How It Works

### Data Structure
- **Questions Table**: Stores 8 quiz questions
- **Options Table**: Stores 4 answer options per question (32 total)
- **View**: Joins them together for easy querying

### Frontend Flow
1. App queries `quiz_with_options` view
2. If view doesn't exist, falls back to querying tables directly
3. Groups options by question
4. Renders questions with their options

### What We Fixed
- ✅ Added fallback logic if view doesn't exist
- ✅ Better error handling for missing data
- ✅ Enhanced debugging logs
- ✅ Filtered out invalid options
- ✅ Improved rendering with proper keys

## 🧪 Testing Checklist

- [ ] Run `QUIZ_DATABASE_SETUP.sql` in Supabase
- [ ] Verify 8 questions and 32 options were created
- [ ] Refresh app and go to quiz
- [ ] See question text
- [ ] See 4 answer options per question
- [ ] Can select an option
- [ ] Can navigate between questions
- [ ] Can complete quiz and see results

## 🐛 Troubleshooting

### If options still don't show:
1. **Check console logs** - Look for `=== QUIZ DATA LOAD DEBUG ===`
2. **Verify database** - Run this in Supabase SQL Editor:
   ```sql
   SELECT COUNT(*) FROM archetype_quiz_questions; -- Should be 8
   SELECT COUNT(*) FROM archetype_quiz_options; -- Should be 32
   SELECT * FROM quiz_with_options LIMIT 5; -- Should show data
   ```
3. **Check RLS policies** - Make sure policies allow SELECT
4. **Check network tab** - Look for API errors

### Common Issues:
- **View doesn't exist**: The fallback will query tables directly
- **No data**: Run the setup SQL to insert sample data
- **RLS blocking**: Check that policies allow public read access
- **Data structure mismatch**: Check console logs for data structure

## 📊 Expected Console Output

When quiz loads successfully, you should see:
```
=== QUIZ DATA LOAD DEBUG START ===
1. quiz_with_options view result: { hasData: true, dataLength: 32, ... }
2. Grouped and sorted quiz data: { questionsCount: 8, ... }
=== QUIZ DATA LOAD DEBUG END ===
=== ARCHETYPE QUIZ DEBUG ===
Quiz Data: { totalQuestions: 8, currentQuestionIndex: 0, optionsCount: 4, ... }
```

## 🎉 Next Steps

Once quiz is working:
1. User completes all 8 questions
2. Quiz calculates archetype scores
3. Determines top archetype (The Guide, The Trailblazer, etc.)
4. Saves results to `teachers.quiz_result` (JSONB)
5. Updates `teachers.archetype` field
6. Sets `profile_complete` to `true`
7. Shows archetype results page

Let's get this working! 🚀

