import { MongoClient, type Db, ObjectId } from "mongodb"
import type { Reserva, Usuario } from "./database"

// URL de conexión a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/lallosa"

// Cliente de MongoDB
let client: MongoClient
let db: Db

// Función para conectar a la base de datos
export async function connectToDatabase(): Promise<{ db: Db; client: MongoClient }> {
  if (client && db) {
    return { db, client }
  }

  if (!global._mongoClient) {
    client = await MongoClient.connect(MONGODB_URI)
    db = client.db()

    // Guardar la conexión en el objeto global para reutilizarla
    global._mongoClient = client
    global._db = db
  } else {
    client = global._mongoClient
    db = global._db
  }

  return { db, client }
}

// Función para cerrar la conexión
export async function closeConnection(): Promise<void> {
  if (client) {
    await client.close()
  }
}

// Funciones para usuarios
export async function getUsuarios(): Promise<Usuario[]> {
  const { db } = await connectToDatabase()
  const collection = db.collection("usuarios")
  return (await collection.find({}).toArray()) as Usuario[]
}

export async function getUsuarioById(id: string): Promise<Usuario | null> {
  const { db } = await connectToDatabase()
  const collection = db.collection("usuarios")
  return (await collection.findOne({ _id: new ObjectId(id) })) as Usuario | null
}

export async function getUsuarioByEmail(email: string): Promise<Usuario | null> {
  const { db } = await connectToDatabase()
  const collection = db.collection("usuarios")
  return (await collection.findOne({ email })) as Usuario | null
}

export async function createUsuario(usuario: Omit<Usuario, "id" | "createdAt" | "updatedAt">): Promise<Usuario> {
  const { db } = await connectToDatabase()
  const collection = db.collection("usuarios")

  const now = new Date()
  const newUsuario = {
    ...usuario,
    createdAt: now,
    updatedAt: now,
  }

  const result = await collection.insertOne(newUsuario)
  return {
    ...newUsuario,
    id: result.insertedId.toString(),
  } as Usuario
}

export async function updateUsuario(id: string, data: Partial<Usuario>): Promise<Usuario | null> {
  const { db } = await connectToDatabase()
  const collection = db.collection("usuarios")

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...data,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  )

  return result.value as Usuario | null
}

// Funciones para reservas
export async function getReservas(): Promise<Reserva[]> {
  const { db } = await connectToDatabase()
  const collection = db.collection("reservas")
  return (await collection.find({}).toArray()) as Reserva[]
}

export async function getReservaById(id: string): Promise<Reserva | null> {
  const { db } = await connectToDatabase()
  const collection = db.collection("reservas")
  return (await collection.findOne({ _id: new ObjectId(id) })) as Reserva | null
}

export async function getReservasByUsuarioId(usuarioId: string): Promise<Reserva[]> {
  const { db } = await connectToDatabase()
  const collection = db.collection("reservas")
  return (await collection.find({ idUsuario: usuarioId }).toArray()) as Reserva[]
}

export async function getReservasByDate(fecha: Date): Promise<Reserva[]> {
  const { db } = await connectToDatabase()
  const collection = db.collection("reservas")

  // Crear fechas para el inicio y fin del día
  const startOfDay = new Date(fecha)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(fecha)
  endOfDay.setHours(23, 59, 59, 999)

  return (await collection
    .find({
      fecha: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      estado: { $ne: "cancelada" },
    })
    .toArray()) as Reserva[]
}

export async function createReserva(reserva: Omit<Reserva, "id" | "createdAt" | "updatedAt">): Promise<Reserva> {
  const { db } = await connectToDatabase()
  const collection = db.collection("reservas")

  const now = new Date()
  const newReserva = {
    ...reserva,
    createdAt: now,
    updatedAt: now,
  }

  const result = await collection.insertOne(newReserva)
  return {
    ...newReserva,
    id: result.insertedId.toString(),
  } as Reserva
}

export async function updateReserva(id: string, data: Partial<Reserva>): Promise<Reserva | null> {
  const { db } = await connectToDatabase()
  const collection = db.collection("reservas")

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...data,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  )

  return result.value as Reserva | null
}

export async function cancelarReserva(id: string): Promise<Reserva | null> {
  return await updateReserva(id, { estado: "cancelada" })
}

