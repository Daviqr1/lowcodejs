import mongoose from 'mongoose';

import { Evaluation } from '@application/model/evaluation.model';
import { Field } from '@application/model/field.model';
import { Permission } from '@application/model/permission.model';
import { Reaction } from '@application/model/reaction.model';
import { RelationshipDefinition } from '@application/model/relationship-definition.model';
import { RelationshipLink } from '@application/model/relationship-link.model';
import { Storage } from '@application/model/storage.model';
import { Table } from '@application/model/table.model';
import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { ValidationToken } from '@application/model/validation-token.model';
import { Env } from '@start/env';

// Registra os schemas no mongoose antes de conectar. O array tambem retem os
// imports nomeados: no build `bundle: false` o esbuild remove import nomeado
// nao referenciado, o que descartaria o side-effect de registro do schema.
export const REGISTERED_MODELS = [
  Evaluation,
  Field,
  Permission,
  Reaction,
  RelationshipDefinition,
  RelationshipLink,
  Storage,
  Table,
  UserGroup,
  User,
  ValidationToken,
] as const;

let dataConnection: mongoose.Connection;

export function getDataConnection(): mongoose.Connection {
  if (!dataConnection) {
    throw new Error(
      'Data connection not initialized. Call MongooseConnect() first.',
    );
  }
  return dataConnection;
}

export function setDataConnection(conn: mongoose.Connection): void {
  dataConnection = conn;
}

export async function MongooseConnect(): Promise<void> {
  try {
    await mongoose.connect(Env.DATABASE_URL, {
      autoCreate: true,
      dbName: Env.DB_DATABASE,
    });

    dataConnection = mongoose.createConnection(Env.DATABASE_URL, {
      autoCreate: true,
      dbName: Env.DB_DATA_DATABASE,
    });
    await dataConnection.asPromise();
  } catch (error) {
    console.error(error);
    if (dataConnection) {
      await dataConnection.close();
    }
    await mongoose.disconnect();
    process.exit(1);
  }
}
