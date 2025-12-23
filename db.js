const Mariadb = require("mariadb")
const Pool = Mariadb.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "aponga",
    supportBigNumbers: true,
    bigNumberStrings: true
})
module.exports = Pool