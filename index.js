const express = require('express');
const mysql = require('mysql');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;


// insert -> 1;
// delete -> 2;
// update -> 3;

app.listen(PORT, (error) => {
  if (!error)
    console.log("Server is Successfully Running, and App is listening on port " + PORT)
  else
    console.log("Error occurred, server can't start", error);
});


const connection = mysql.createConnection({
  host: 'localhost',
  user: 'your_username',
  password: 'your_password',
  database: 'your_database_name'
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err.stack);
    return;
  }
  console.log('Connected to the database.');
});



// TOP level Database

function insertData() {
  const postData = { name: 'John', age: 30 };
  const query = connection.query('INSERT INTO users SET ?', postData, (err, result) => {
    if (err) throw err;
    console.log('Data inserted:', result.insertId);
    insertForVersionControl(entityId, postData);
  });

}

function getData(tranaction_id) {
  connection.query('SELECT * FROM users', (err, rows) => {
    if (err) throw err;
    console.log('Data received:', rows);
    getSpecificVersion(tranaction_id);
  });
}

function updateData() {
  const updateData = ['Jane', 1];  // Set name to 'Jane' where id is 1
  connection.query('UPDATE users SET name = ? WHERE id = ?', updateData, (err, result) => {
    if (err) throw err;
    console.log('Data updated:', result.affectedRows);
    updateForVersionControl(result.affectedRows, updateData)
  });
}

function deleteData(entity_id) {
  connection.query('DELETE FROM users WHERE id = ?', [entity_id], (err, result) => {
    if (err) throw err;
    console.log('Data deleted:', result.affectedRows);
    deleteForVersionControl(result.entity_id, result)
  });
}


// Version Control level Database


function insertForVersionControl(entityId, postData) {
  const tranaction_id = uuidv4();
  const transVals = [tranaction_id, entityId];
  const queryForTranactionDatabase = connection.query('INSERT INTO transaction_users  (trantype, transaction_id) VALUES (1, ?)', tranaction_id, (err, result) => {
    if (err) throw err;
    console.log('Data inserted:', result.insertId);
  })
  postData['entityId'] = entityId;
  postData['transaction_id'] = tranaction_id;
  const allTransactionDB = connection.query('INSERT INTO users_version_control SET ?', postData, (err, result) => {
    if (err) throw err;
    console.log('Data inserted:', result.insertId);
  });
  return tranaction_id;
}


function deleteForVersionControl(entityId, postData) {
  const tranaction_id = uuidv4();
  const transVals = [tranaction_id, entityId];
  const queryForTranactionDatabase = connection.query('INSERT INTO transaction_users  (trantype, transaction_id, entityId) VALUES (2, ?, ?)', transVals, (err, result) => {
    if (err) throw err;
    console.log('Data inserted:', result.insertId);
  })
  postData['entityId'] = entityId;
  postData['transaction_id'] = tranaction_id;
  const allTransactionDB = connection.query('INSERT INTO users_version_control SET ?', postData, (err, result) => {
    if (err) throw err;
    console.log('Data inserted:', result.insertId);
  });
  return tranaction_id;
}


function updateForVersionControl(entityId, postData) {
  const tranaction_id = uuidv4();
  const transVals = [tranaction_id, entityId];
  const queryForTranactionDatabase = connection.query('INSERT INTO transaction_users  (trantype, transaction_id, entityId) VALUES (3, ?, ?)', tranaction_id, (err, result) => {
    if (err) throw err;
    console.log('Data inserted:', result.insertId);
  })
  postData['entityId'] = entityId;
  const allTransactionDB = connection.query('INSERT INTO users_version_control SET ?', postData, (err, result) => {
    if (err) throw err;
    console.log('Data inserted:', result.insertId);
  });
  return tranaction_id;
}


// View level Only  Database 

async function getSpecificVersion(tranaction_id) {
  // Using a timestamp column for ordering
  connection.query('SELECT * FROM your_table_name', async (err, rows) => {
    if (err) throw err;
    manipulateData(rows);
    const query = 'SELECT * FROM transaction_users ORDER BY created_at DESC';
    connection.query(query, async (err, results) => {
      if (err) throw err;
      for (res in results) {
        switch (res.trantype) {
          case 1: {
            rows.splice(res.entity_index, res.entity_index);
            break;
          }
          case 2: {
            try {
              const data = await getUsersCompleteDB(res.tranaction_id);
              rows.push(res.entity_index, data);
              console.log('Data:', data);
            } catch (error) {
              console.error('Error fetching data:', error);
            } finally {
              connection.end();  // Close the connection
            }
            break;
          }
          case 3: {
            try {
              const data = await getUsersCompleteDB(res.tranaction_id);
              rows[res.entity_index] = data;
              console.log('Data:', data);
            } catch (error) {
              console.error('Error fetching data:', error);
            } finally {
              connection.end();  // Close the connection
            }
            break;
          }
        }
      }
    });
  });
}


function getUsersCompleteDB(transaction_id) {
  return new Promise((resolve, reject) => {
    connection.query('SELECT * FROM users_version_control where transaction_id = ?', transaction_id, (err, results) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(results);
    });
  })
}






// Don't forget to close the connection when done
// connection.end();



