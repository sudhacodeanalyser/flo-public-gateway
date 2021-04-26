# install
See https://github.com/golang-migrate/migrate/tree/master/cmd/migrate to install migrate. Set your environmen from vault.

# migrate up and down

To move forward use
`migrate -database postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}/${POSTGRES_DATABASE}?x-migrations-table=pubgw_schema_migrations -path pgsql/migrations/ up`

To move backwards use
`migrate -database postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}/${POSTGRES_DATABASE}?x-migrations-table=pubgw_schema_migrations -path pgsql/migrations/ down`

# best practices
On up scripts use transactions in order to create data such as

```
BEGIN;
    [..statements here..]
    COMMIT;
END;
```

On down scrips delete only what was created on the up step.

If an up step fails then fix the problem and force the step up or manually change the dirty flag on the migration table.