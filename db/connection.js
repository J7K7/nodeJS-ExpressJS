const mysql = require('mysql2/promise');
const config = require('../config');

let pool;

const createPool = (() => {

    return async function () {
        try {
            if (!pool) {
                pool = mysql.createPool(config.db);
                // console.log('Created');
                }
        
                return pool.getConnection();
        } catch (error) {
            console.log('Error In Creating Pool : ' + error);
            throw error;
        }
    };

})();
  
async function executeQuery(sql, params){
    const connection = await createPool();
    try{
        const [result] = await connection.execute(sql, params);
        console.log("Succes excution Of query");
        return result;
    } catch (error){
        console.log('Error In Executing Query : ' + error);
        throw error;
    } finally{
        connection.release();
    }
}

module.exports = executeQuery;

