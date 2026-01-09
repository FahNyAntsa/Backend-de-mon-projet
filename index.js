const express = require("express")
const Port = 8000
const app = express()
const multer = require("multer")
const db = require("./db")
const cors = require("cors")
const path = require("path")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const cookieParser = require("cookie-parser")
require("dotenv").config()

app.use(cors({
    origin: ["http://localhost:5173"],
    credentials: true
}))
app.use(cookieParser())
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use("/upload/users", express.static(path.join(__dirname, './Public/Upload/Users')))
const TokenVerify = (req, res, next) => {
    try {
        const Token = req.cookies.Token
        // console.log(req.cookies)
        if (Token) {
            const Auth = jwt.verify(Token, process.env.TOKEN)
            req.userInfo = Auth
        } else {
            res.json({ status: 405, message: "Token invalid" })
        }
        next()
    } catch (error) {
        console.log(error)
    }
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./Public/Upload/Users")
    },
    filename: (req, file, cb) => {
        const filename = file.originalname
        const extension = path.extname(filename)
        const imageName = "SARY_" + Math.round(Math.random() * 99999999999999999) + extension
        cb(null, imageName)
    }
})

// USERS INFO DEBUT
const UserPhotoUploaded = multer({ storage })
app.post("/Registing", UserPhotoUploaded.single("image"), async (req, res) => {
    try {
        const body = { ...req.body }
        const nom = body.nom
        const prenom = body.prenom
        const email = body.email
        const mdp = body.password
        const salt = await bcrypt.genSalt(10)
        const password = await bcrypt.hash(mdp, salt)
        const image = req.file ? req.file.filename : "default.jpg"
        // console.log({ nom, prenom, email, mdp, password, image })
        // VERIFICATION SI L'USER EXISTE
        const SqlUserVerifing = "SELECT * FROM users WHERE email=?"
        const emailUserVerifing = email
        const NumberUser = await db.execute(SqlUserVerifing, emailUserVerifing)
        if (NumberUser.length === 0) {
            // INSERTION DE L'USER 
            const Sql = "INSERT INTO users(lastname,firstname,email,password,picture) VALUES(?,?,?,?,?)"
            const Values = [nom, prenom, email, password, image]
            const User = db.execute(Sql, Values)
            res.json({ message: "Inscription réussite", status: 200 })
        } else {
            res.json({ message: "L'email a déjà un compte", status: 401 })
        }
    } catch (error) {
        console.log(error)
    }
})

app.post("/Login", async (req, res) => {
    try {
        const body = { ...req.body }
        const Email = body.Email
        const Password = body.Password
        // console.log(body)
        const Sql = "SELECT * FROM users WHERE email=?"
        const Value = Email
        const [rows] = await db.execute(Sql, Value)
        const User = rows
        // console.log(User)
        // console.log(rows)
        if (User) {
            const MdpValid = await bcrypt.compare(Password, User.password)
            if (MdpValid) {
                const TOKEN_KEY = process.env.TOKEN
                const Token = jwt.sign({
                    id: User.id,
                    email: User.email,
                    nom: User.lastname,
                    prenom: User.firstname,
                    photo: User.picture
                },TOKEN_KEY,{ expiresIn: 1000 * 60 * 60 * 24 * 7 })
                // console.log(User)
                // console.log(Token)
                res.cookie("Token", Token, { httpOnly: true, secure: false, sameSite: "lax" })
                res.json({
                    status: 200,
                    user: {
                        id: User.id,
                        email: User.email,
                        nom: User.lastname,
                        prenom: User.firstname,
                        photo: User.picture
                    }
                })
            } else {
                res.json({ status: 402, message: "Mot de passe Invalid" })
            }
        } else {
            res.json({ status: 301, message: "Aucun utilisateur trouvé" })
        }
    } catch (error) {
        console.log(error)
    }
})
app.post("/Logout", (req, res) => {
    try {
        res.clearCookie("Token", {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            path: "/"
        })
        res.json({ status: 200, message: "Déconnexion réussie" })
    } catch (error) {
        console.log(error)
    }
})

// USERS INFO FIN

app.get("/Drum", TokenVerify, async (req, res) => {
    try {
        const User = req.userInfo
        // console.log(User.prenom)
        const Sql = "SELECT * FROM products WHERE category=?"
        const Drum = await db.execute(Sql, "drum")
        // console.log(req.userInfo)
        res.json({ Drum, User })
    } catch (error) {
        console.log(`erreur Sql trouvée : ${error}`)
    }
})
app.get("/AccessoriesOne", TokenVerify, async (req, res) => {
    try {
        const page = parseInt(req.query.page)
        const pageLimit = parseInt(req.query.limit)
        // console.log(page, pageLimit)
        // console.log(req.params)
        const pageOffset = (page - 1) * pageLimit
        const SqlProduct = "SELECT * FROM products WHERE category IN ('accessoriesOne','accessoriesTwo') LIMIT ? OFFSET ?"
        const SqlNombreTotalDeProduit = "SELECT COUNT(*) AS Total FROM products WHERE category IN ('accessoriesOne','accessoriesTwo')"
        const nombreTotalDeProduit = await db.query(SqlNombreTotalDeProduit)
        const Drum = await db.execute(SqlProduct, [pageLimit, pageOffset])
        const nombreTotalDePage = Math.ceil(nombreTotalDeProduit[0].Total / pageLimit)
        // console.log(Drum)
        // console.log(nombreTotalDePage)
        // console.log(nombreTotalDeProduit[0].Total)
        res.json({ Drum, nombreTotalDePage: nombreTotalDePage, nombreTotalDeProduit: nombreTotalDeProduit[0].Total })
    } catch (error) {
        console.log(`erreur Sql trouvée : ${error}`)
    }
})
app.get("/Accessories", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const pageLimit = parseInt(req.query.limit) || 5
        const pageOffset = (page - 1) * pageLimit
        // console.log(page, pageLimit)
        // console.log(req.params)
        const name = req.query.accessoire
        const Value = `%${name}%`
        // console.log(name)
        const Sql = "SELECT * FROM products WHERE name LIKE ? AND category IN ('drum','accessoriesOne','accessoriesTwo')"
        const SqlNombreTotalDeProduit = "SELECT COUNT(*) AS Total FROM products WHERE name LIKE ? AND category IN ('accessoriesOne','accessoriesTwo')"
        const SearchResponse = await db.execute(Sql,Value)
        const nombreTotalDeProduit = await db.execute(SqlNombreTotalDeProduit,[Value])
        const nombreTotalDePage = Math.ceil(nombreTotalDeProduit[0].Total / pageLimit)
        res.json({SearchResponse,nombreTotalDePage:nombreTotalDePage,nombreTotalDeProduit:nombreTotalDeProduit})
    } catch (error) {
        console.log(`erreur Sql trouvée : ${error}`)
    }
})
app.get("/Product/:id", TokenVerify, async (req, res) => {
    try {
        const id = req.params.id
        const User = req.userInfo
        // console.log(id)
        const Sql = "SELECT * FROM products WHERE id=?"
        const response = await db.execute(Sql, id)
        res.json({ response, User, status: 200 })
    } catch (error) {
        console.log(`erreur Sql trouvée : ${error}`)
    }
})
app.post("/Product", TokenVerify, async (req, res) => {
    try {
        const ProductId = {...req.body}
        // const ProductId = req.params.id
        const UserId = req.userInfo.id
        // console.log(req.userInfo)
        console.log(ProductId.id,UserId)
        const Sql = "INSERT INTO command(user_id,product_id) VALUES(?,?)"
        const Values = [UserId,ProductId.id]
        const response = await db.execute(Sql,Values)
        res.json({response,status:200})
        // res.json({ status: 200, message: "produit ajoutée" })
    } catch (error) {
        console.log(error)
    }
})
app.get("/Product", TokenVerify, async (req, res) => {
    try {
        const UserId = req.userInfo.id
        const Sql = "SELECT products.id AS products_id,products.name,products.describes,products.pics,products.category,products.price,command.id AS command_id,command.product_id,command.status FROM command INNER JOIN products ON command.product_id=products.id WHERE command.user_id=? ORDER BY command_at DESC"

        const response = await db.execute(Sql, [UserId])
        // console.log(UserId)
        res.json(response)
    } catch (error) {
        console.log(error)
    }
})
app.delete("/Product/:id", TokenVerify, async (req, res) => {
    try {
        const ProductId = req.params.id
        const Sql = "DELETE FROM command WHERE id=?"
        const response = db.execute(Sql, ProductId)
        // console.log(ProductId)
        res.json(response)
    } catch (error) {
        console.lopg(error)
    }
})
app.listen(Port, () => console.log("Le serveur est démarré sur le port" + Port))