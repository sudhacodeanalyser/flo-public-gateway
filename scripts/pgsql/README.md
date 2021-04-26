# install
See https://github.com/golang-migrate/migrate/tree/master/cmd/migrate to install migrate. Set your environmen from vault.

# migrate up and down

To move forward use
`migrate -database postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}/${POSTGRES_DATABASE}?x-migrations-table=pubgw_schema_migrations -path pgsql/migrations/ up`

To move backwards use
`migrate -database postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}/${POSTGRES_DATABASE}?x-migrations-table=pubgw_schema_migrations -path pgsql/migrations/ down`