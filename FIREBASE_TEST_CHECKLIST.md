# Firebase Integration Test Checklist

## ✅ Test 1: Verify Connection Status
**What to check:**
- Look at the top of your app
- You should see: **"✅ Firebase connected! Data is syncing to cloud."**
- If you see an error message, note what it says

**Expected result:** Green success message ✅

---

## ✅ Test 2: Add a Task
**Steps:**
1. Go to **Table View** tab
2. Add a new task (epic, feature, or story)
3. Fill in some details (title, story points, dates)
4. Save it

**What to verify:**
- Task appears in the table immediately
- Check browser console (F12) - should see no Firebase errors
- Task should persist after page refresh

**Expected result:** Task saves and persists ✅

---

## ✅ Test 3: Check Firestore Database
**Steps:**
1. Go to [Firebase Console](https://console.firebase.google.com/project/roadmap-19885/firestore)
2. Click on **"Data"** tab
3. Look for a collection called **"tasks"**
4. Click on it
5. You should see a document called **"roadmap-tasks-v1"**
6. Click on it to see your data

**What to verify:**
- Collection "tasks" exists
- Document "roadmap-tasks-v1" exists
- Data inside matches what you added in the app

**Expected result:** Data visible in Firestore ✅

---

## ✅ Test 4: Real-time Sync (Multi-Tab Test)
**Steps:**
1. Open your app in **two browser tabs** (same browser or different browsers)
2. In Tab 1: Add or edit a task
3. Watch Tab 2

**What to verify:**
- Changes in Tab 1 should appear automatically in Tab 2
- No need to refresh Tab 2
- This proves real-time sync is working

**Expected result:** Changes sync automatically ✅

---

## ✅ Test 5: Data Persistence
**Steps:**
1. Add several tasks with different data:
   - An Epic with story points
   - A Feature under that Epic
   - A Story under that Feature
2. Refresh the page (F5)
3. Check if all data is still there

**What to verify:**
- All tasks remain after refresh
- Hierarchy (Epic → Feature → Story) is preserved
- Story points, dates, and other fields are intact

**Expected result:** All data persists ✅

---

## ✅ Test 6: CSV Import/Export
**Steps:**
1. Click **"Export CSV"** button
2. Save the CSV file
3. Clear all tasks (or use a different browser)
4. Click **"Import CSV"** button
5. Select the CSV file you just exported

**What to verify:**
- CSV exports successfully
- CSV imports successfully
- All data is restored correctly
- Data appears in Firestore after import

**Expected result:** CSV import/export works ✅

---

## ✅ Test 7: Edit Existing Data
**Steps:**
1. Edit an existing task:
   - Change story points
   - Update dates
   - Modify title
2. Save changes
3. Refresh the page

**What to verify:**
- Changes save successfully
- Changes persist after refresh
- Changes appear in Firestore console

**Expected result:** Edits save and persist ✅

---

## ✅ Test 8: Delete Task
**Steps:**
1. Delete a task
2. Refresh the page
3. Check Firestore console

**What to verify:**
- Task is removed from the app
- Task data is removed from Firestore
- Other tasks remain intact

**Expected result:** Deletion works ✅

---

## ✅ Test 9: Gantt Chart Updates
**Steps:**
1. Go to **Gantt Chart** tab
2. Drag a task bar to change dates
3. Resize a task bar
4. Refresh the page

**What to verify:**
- Changes appear in Gantt chart
- Changes persist after refresh
- Changes sync to Table View

**Expected result:** Gantt chart syncs with Firestore ✅

---

## ✅ Test 10: Dashboard Data
**Steps:**
1. Go to **Roadmap Dashboard** tab
2. Check if charts load correctly
3. Verify story points calculations
4. Check spend data (if you have resourcing data)

**What to verify:**
- Charts display correctly
- Data matches your tasks
- No errors in console

**Expected result:** Dashboard loads correctly ✅

---

## 🔍 Browser Console Checks

While testing, keep the browser console open (F12) and watch for:
- ✅ No red error messages
- ✅ Firebase connection logs
- ✅ Firestore read/write operations
- ⚠️ Any warnings (usually OK, but note them)

---

## 🐛 If Something Doesn't Work

1. **Check browser console** (F12) for error messages
2. **Check Firestore console** - is data actually being saved?
3. **Check network tab** - are Firebase requests succeeding?
4. **Try refreshing** the page
5. **Check Firestore rules** - make sure they allow read/write

---

## 📊 Success Criteria

Your Firebase integration is working correctly if:
- ✅ Connection status shows "Firebase connected!"
- ✅ Tasks save and persist after refresh
- ✅ Data appears in Firestore console
- ✅ Real-time sync works between tabs
- ✅ No errors in browser console
- ✅ All features (add, edit, delete) work

---

## 🎉 Next Steps After Testing

Once everything works:
1. Consider adding Firebase Authentication (for user-specific data)
2. Set up proper security rules (restrict access by user)
3. Consider adding data validation
4. Set up backups/export schedules

