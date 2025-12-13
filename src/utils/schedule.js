export function groupTasks(tasks) {
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const groups = {
    overdue: [],
    today: [],
    upcoming: [],
    completed: []
  };

  tasks.forEach((task) => {
    if (task.completed) {
      groups.completed.push(task);
      return;
    }

    const due = new Date(task.dueDate);
    due.setHours(0, 0, 0, 0);

    if (due < today) {
      groups.overdue.push(task);
    } else if (due.getTime() === today.getTime()) {
      groups.today.push(task);
    } else {
      groups.upcoming.push(task);
    }
  });

  return groups;
}
