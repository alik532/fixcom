import http from 'http'
import axios from 'axios';
import mysql from 'mysql2'
import dotenv from 'dotenv'

dotenv.config()

const ACCESS_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjJiMjc1ZmY2NzA3ZmE2NGI5NDNiODY5MDkwZjE0YjU2ZWNiMjllYjQ0OTExZDFiOTJjMGYzODQyNjdlOWQ2ZGZkYjI0ZWFlYTM3NTNhMTI3In0.eyJhdWQiOiJmOTQ5NDdkNy1jMmJiLTQyM2MtYWUxZC03MmRlY2JlMWVhODYiLCJqdGkiOiIyYjI3NWZmNjcwN2ZhNjRiOTQzYjg2OTA5MGYxNGI1NmVjYjI5ZWI0NDkxMWQxYjkyYzBmMzg0MjY3ZTlkNmRmZGIyNGVhZWEzNzUzYTEyNyIsImlhdCI6MTY4NDg0NTU2MiwibmJmIjoxNjg0ODQ1NTYyLCJleHAiOjE2ODQ5MzE5NjIsInN1YiI6Ijk2MzA1NTAiLCJncmFudF90eXBlIjoiIiwiYWNjb3VudF9pZCI6MzEwNzEwNDIsImJhc2VfZG9tYWluIjoiYW1vY3JtLnJ1IiwidmVyc2lvbiI6InYyIiwic2NvcGVzIjpbInB1c2hfbm90aWZpY2F0aW9ucyIsImZpbGVzIiwiY3JtIiwiZmlsZXNfZGVsZXRlIiwibm90aWZpY2F0aW9ucyJdfQ.YlUL7evlEZQA2G2-xU4uFnw-YjEZiXL6mvFhFYw5WOi1UthFNoQ8P0npoMQIbPbBy_qhvUTPc-u8hJNzOu5hN_gyVSFuP0Am1_HumfK1B8AtG9gBadXC2glmyqy_HADiYNnqbU7mpqWoVfortJO3skgPwo_ALRm7O3eQeUh5A4G7WiAx3rFCxa7hc-WmG3XUY2_zTUbtkRhMKiE9nNaWCT2gWooVpGQPaYo5R1JPPtaZSNEKX2ariy3I6zHiY30n-B6n_9xNkiD2FkXtvxo_UFdoXG0uJZBmqP5O-C33knju6pCeB_RjjEOygGxX-ONkjvj4az4zhWhJLsirSaGYmg';
const LEADS_URL = 'https://alibeknurtuleu.amocrm.ru/api/v4/leads';
const headers = {
  Authorization: `Bearer ${ACCESS_TOKEN}`,
}

async function getAllLeadsFromCRM() {
  
  try {
    let res = []
    // Make a GET request to the external API using Axios with the access token
    let response = await axios.get(`${LEADS_URL}`, {headers});
    // initial array
    response.data._embedded.leads.map(async lead => {
      res.push({
        id: lead.id,
        name: lead.name,
        created_at: convertUnixTimestamp(lead.created_at),
        responsibleUser: lead.responsible_user_id, 
        pipeline: lead.pipeline_id,
        price: lead.price,
        status_id: lead.status_id,
      })
    });
    //second request
    for (let i = 0; i < res.length; i++) {
      res[i].pipeline = await axios.get(`https://alibeknurtuleu.amocrm.ru/api/v4/leads/pipelines/${res[i].pipeline}/statuses/${res[i].status_id}`, {headers}).then(pipelineResponse => pipelineResponse.data.name)
      res[i].responsibleUser = await axios.get(`https://alibeknurtuleu.amocrm.ru/api/v4/users/${res[i].responsibleUser}`, {headers}).then(userResponse => userResponse.data.name)
    }
    return res;
    
  } catch (error) {
    console.error(error.message);
  }
  
}

async function syncDatabase() {
   
  const array = await getAllLeadsFromCRM().then(val => val)
  console.log(array)
  for (let i = 0; i < array.length; i++) {
    insert(array[i].id, array[i].name, array[i].pipeline, array[i].responsibleUser, array[i].created_at, array[i].price)
  }
  
  console.log("This function is called every 5 minutes.");
}

// Function to be called when the app initializes
function initialize() {
  // Call the function immediately
  syncDatabase();

  setInterval(syncDatabase, 300000);
}


// DATABASE

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
}).promise()



async function insert(id, name, status, responsible, date, price) {
      const values = [id, name, status, responsible, date, price];
      //init query
      await pool.query(`CREATE DATABASE IF NOT EXISTS fixcom;`, values , (err, results) => {
        if (err) {
          console.error('Error creating database:', err);
          // Handle error
        } else {
          console.log('database created if not exist');
          // Handle success
        }
      }) 

      await pool.query(`
        CREATE TABLE IF NOT EXISTS leads (id integer primary key,
          name varchar(255) not null,
          status varchar(255),
          responsible varchar(255),
          date varchar(255),
          price integer
        );
      `,values , (err, results) => {
        if (err) {
          console.error('Error creating table', err);
          // Handle error
        } else {
          console.log('table created id not exist');
          // Handle success
        }
      })

      const sql = `
      INSERT INTO leads (id, name, status, responsible, date, price)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        status = VALUES(status),
        responsible = VALUES(responsible),
        date = VALUES(date),
        price = VALUES(price)
    `;
      
      await pool.query(sql, values, (err, results) => {
        if (err) {
          console.error('Error inserting/updating row:', err);
          // Handle error
        } else {
          console.log('Row inserted/updated successfully');
          // Handle success
        }
      });
}   

initialize();

const server = http.createServer(async (request, response) => {
  // Allow cors header
  const serverHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
    "Access-Control-Max-Age": 2592000, // 30 days
  }
  
  if (request.method === 'GET' && request.url.slice(0, 10) == '/api/leads') {
    // Extract the URL and query parameters
    console.log("leadsURL")
    const { url } = request;
    const queryParams = new URLSearchParams(url.slice(url.indexOf('?')));
    const query = queryParams.get('query');
    // Check if there are any query parameters
    console.log("query: " + query)
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.writeHead(200, serverHeaders)
    if (query == null) {
      // Handle request without parameters
      response.statusCode = 200;
      response.write(JSON.stringify(await getAllRowsFromLeads()), 'utf-8');
      response.end();
      return;
    }
    else {
      response.statusCode = 200;
      response.write(JSON.stringify(await selectByFilteredLeads(await getLeadsWithQueryParam(query))), 'utf-8')
      response.end();
    }
    // Get the value of the 'name' parameter
  } else {
    // Handle non-GET requests
    response.statusCode = 405;
    response.end('Method Not ddasd');
  }
})

const port = 3000; 
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

async function selectByFilteredLeads(filteredLeads) {
  console.log("Fitered leads: "+filteredLeads)
  try {
    // Create a MySQL connection pool
    // Get a connection from the pool
    const connection = await pool.getConnection();

    // Escape and format the IDs array for the query
    const escapedIds = filteredLeads.map((lead) => connection.escape(lead.id));
    const formattedIds = escapedIds.join(',');

    // Perform the database query
    const query = `SELECT * FROM leads WHERE id IN (${formattedIds})`;
    const [rows] = await connection.query(query);

    // Release the connection back to the pool
    connection.release();

    // Return the selected rows
    console.log(rows)
    return rows;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

async function getLeadsWithQueryParam(query) {
  const resp = await axios.get(`${LEADS_URL}?query=${query}`, {
    headers
  });
  let res = []
  resp.data._embedded.leads.map(async lead => {
    res.push({
      id: lead.id,
      name: lead.name,
      created_at: convertUnixTimestamp(lead.created_at),
      responsibleUser: lead.responsible_user_id, 
      pipeline: lead.pipeline_id,
      price: lead.price,
      status_id: lead.status_id,
    })
  });
  //second request
  for (let i = 0; i < res.length; i++) {
    res[i].pipeline = await axios.get(`https://alibeknurtuleu.amocrm.ru/api/v4/leads/pipelines/${res[i].pipeline}/statuses/${res[i].status_id}`, {headers}).then(pipelineResponse => pipelineResponse.data.name)
    res[i].responsibleUser = await axios.get(`https://alibeknurtuleu.amocrm.ru/api/v4/users/${res[i].responsibleUser}`, {headers}).then(userResponse => userResponse.data.name)
  }
  console.log(res)
  return res
}

async function getAllRowsFromLeads() {
  try {
          
    // Get a connection from the pool
    const connection = await pool.getConnection();

    // Perform the database query
    const query = `SELECT * FROM leads`;
    const [rows] = await connection.query(query);

    // Release the connection back to the pool
    connection.release();

    // Return the array of rows
    return rows;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

function convertUnixTimestamp(timestamp) {
    const milliseconds = timestamp * 1000;
    const date = new Date(milliseconds);
  
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
  
    return `${year}-${month}-${day}`;
}