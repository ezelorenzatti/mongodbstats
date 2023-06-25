import express, {NextFunction, Request, Response} from 'express';
import {MongoClient, MongoClientOptions} from 'mongodb';

const app = express();
const port = 3000;

app.get('/stats', async (req: Request, res: Response) => {
    const {
        url,
        replicaSet,
        maxPoolSize,
        dbPrefix,
        ssl,
        tls
    } = req.query;

    if (typeof url !== 'string' || url === '') {
        const errorMessage = 'Invalid URL parameter';
        console.error(errorMessage);
        return res.status(400).json({error: errorMessage});
    }

    const clientOptions: MongoClientOptions = {
        replicaSet: replicaSet as string,
        maxPoolSize: maxPoolSize ? parseInt(maxPoolSize as string, 10) : undefined,
        ssl: ssl ? (ssl === 'true') : false,
        tls: tls ? (tls === 'true') : false,
    };

    try {
        console.log('Connecting to MongoDB...');
        const connections = Array.isArray(url) ? url : [url as string];
        const connString = `mongodb://${connections.join(',')}`;

        const client = await MongoClient.connect(connString, clientOptions);

        console.log('Connection established successfully');

        const dbAdmin = client.db('admin');

        console.log('Fetching list of databases...');
        const result = await dbAdmin.admin().listDatabases();

        const databases = result.databases;

        const results = [];

        console.log('Processing databases...');
        for (const database of databases) {
            const dbName = database.name;

            if (dbPrefix && !dbName.startsWith(dbPrefix as string)) {
                continue;
            }

            try {
                const db = client.db(dbName);
                console.log('Fetching list of collections from database', dbName);
                const collections = await db.listCollections().toArray();

                for (const collection of collections) {
                    const collectionName = collection.name;

                    try {
                        console.log(
                            'Fetching storage size of collection',
                            collectionName,
                            'from database',
                            dbName
                        );
                        const stats = await db.command({collStats: collectionName});

                        const result = {
                            database: dbName,
                            collection: collectionName,
                            storageSize: stats.storageSize,
                        };
                        results.push(result);
                    } catch (err) {
                        console.error('Error fetching storage size of collection:', err);
                    }
                }
            } catch (err) {
                console.error('Error fetching list of collections:', err);
            }
        }

        await client.close();
        console.log('Connection closed successfully');

        console.log('Processing completed. Returning results...');
        res.json(results);
    } catch (err) {
        const message = 'Error connecting to MongoDB';
        console.error(message, err);
        res.status(500).json({error: message});
    }
});

app.use((req: Request, res: Response, next: NextFunction) => {
    const errorMessage = 'Endpoint not found';
    console.error(errorMessage);
    res.status(404).json({error: errorMessage});
});


app.listen(port, () => {
    console.log(`Server started on port  ${port}`);
});