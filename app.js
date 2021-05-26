var format = require("date-fns/format");
const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "todoApplication.db");

const app = express();

app.use(express.json());

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const priorityList = ["HIGH", "MEDIUM", "LOW"];
const statusList = ["TO DO", "IN PROGRESS", "DONE"];
const categoryList = ["WORK", "HOME", "LEARNING"];

const hasPriorityAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};

const hasPriorityAndCategoryProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.category !== undefined
  );
};

const hasCategoryAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};

const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const hasCategoryProperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};

function isValidRequest(request, response, next) {
  if (request.query.priority !== undefined) {
    if (priorityList.includes(request.query.priority)) {
      pass;
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
      return;
    }
  }

  if (request.query.status !== undefined) {
    if (statusList.includes(request.query.status)) {
      pass;
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
      return;
    }
  }

  if (request.query.category !== undefined) {
    if (categoryList.includes(request.query.category)) {
      pass;
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
      return;
    }
  }

  if (request.query.date !== undefined) {
    let { date } = request.query;
    let dateArray = date.split("-");
    try {
      date = format(
        new Date(dateArray[0], dateArray[1] - 1, dateArray[2]),
        "yyyy-MM-dd"
      );
    } catch (error) {
      response.status(400);
      response.send("Invalid Due Date");
      return;
    }
  }

  next();
}

app.get("/todos/", isValidRequest, async (request, response) => {
  let data = null;
  let getTodosQuery = "";
  const { search_q = "", priority, status, todo, category } = request.query;
  switch (true) {
    case hasPriorityAndStatusProperties(request.query):
      getTodosQuery = `
            SELECT
                id, todo, priority, category, status, due_date AS dueDate
            FROM 
                todo
            WHERE
                todo LIKE '%${search_q}%'
                AND priority = '${priority}'
                AND status = '${status}';`;
      break;
    case hasPriorityAndCategoryProperties(request.query):
      getTodosQuery = `
            SELECT
                id, todo, priority, category, status, due_date AS dueDate
            FROM 
                todo
            WHERE
                todo LIKE '%${search_q}%'
                AND priority = '${priority}'
                AND category = '${category}';`;
      break;
    case hasCategoryAndStatusProperties(request.query):
      getTodosQuery = `
            SELECT
                id, todo, priority, category, status, due_date AS dueDate
            FROM 
                todo
            WHERE
                todo LIKE '%${search_q}%'
                AND status = '${status}'
                AND category = '${category}';`;
      break;
    case hasPriorityProperty(request.query):
      getTodosQuery = `
            SELECT
                id, todo, priority, category, status, due_date AS dueDate
            FROM 
                todo
            WHERE
                todo LIKE '%${search_q}%'
                AND priority = '${priority}';`;
      break;
    case hasStatusProperty(request.query):
      getTodosQuery = `
            SELECT
                id, todo, priority, category, status, due_date AS dueDate
            FROM 
                todo
            WHERE
                todo LIKE '%${search_q}%'
                AND status = '${status}';`;
      break;
    case hasCategoryProperty(request.query):
      getTodosQuery = `
            SELECT
                id, todo, priority, category, status, due_date AS dueDate
            FROM 
                todo
            WHERE
                todo LIKE '%${search_q}%'
                AND category = '${category}';`;
      break;
    default:
      getTodosQuery = `
            SELECT
                id, todo, priority, category, status, due_date AS dueDate
            FROM 
                todo
            WHERE
                todo LIKE '%${search_q}%';`;
  }
  data = await db.all(getTodosQuery);
  response.send(data);
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
    SELECT
        id, todo, priority, category, status, due_date AS dueDate
    FROM
        todo
    WHERE
        todo_id = ${todoId};`;
  const todoObject = await db.get(getTodoQuery);
  response.send(todoObject);
});

app.get("/agenda/", isValidRequest, async (request, response) => {
  let data = null;
  let { date } = request.query;
  let dateArray = date.split("-");
  date = format(
    new Date(dateArray[0], dateArray[1] - 1, dateArray[2]),
    "yyyy-MM-dd"
  );
  const getAgendaQuery = `
    SELECT
        id, todo, priority, category, status, due_date AS dueDate
    FROM
        todo
    WHERE
        due_date = '${date}';`;
  data = await db.all(getAgendaQuery);
  response.send(data);
});

app.post("/todos/", isValidRequest, async (request, response) => {
  const { id, priority, status, todo, category, dueDate } = request.body;
  const postTodoQuery = `
    INSERT INTO
        todo (id, todo, category, priority, status, due_date)
    VALUES ( ${id}, '${todo}', '${category}', '${priority}', '${status}', '${dueDate}' );
    `;

  await db.run(postTodoQuery);
  response.send("Todo Successfully Added");
});

app.put("/todos/:todoId/", isValidRequest, async (request, response) => {
  const { todoId } = request.params;
  let updateColumn = "";
  const requestBody = request.body;
  switch (true) {
    case requestBody.status !== undefined:
      updateColumn = "Status";
      break;
    case requestBody.priority !== undefined:
      updateColumn = "Priority";
      break;
    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      break;
    case requestBody.category !== undefined:
      updateColumn = "Category";
      break;
    case requestBody.dueDate !== undefined:
      updateColumn = "Due Date";
      break;
  }
  const previousTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE 
      id = ${todoId};`;
  const previousTodo = await db.get(previousTodoQuery);

  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = request.body;

  const updateTodoQuery = `
  UPDATE 
    todo
  SET
    todo = '${todo}',
    status = '${status}',
    priority ='${priority}',
    category = '${category}',
    due_date = '${dueDate}'
  WHERE
    id = ${todoId};`;

  await db.run(updateTodoQuery);
  response.send(`${updateColumn} Updated`);
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
    DELETE FROM
        todo
    WHERE
        id = ${todoId};`;
  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
