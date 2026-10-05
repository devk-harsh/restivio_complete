#!/bin/sh
set -eu
# Local-only service users, each restricted to its own schema.
for service in auth hotel booking; do
  mysql -uroot -p"$MYSQL_ROOT_PASSWORD" <<SQL
CREATE USER IF NOT EXISTS 'restivio_$service'@'%' IDENTIFIED BY '$RESTIVIO_DB_PASSWORD';
GRANT ALL PRIVILEGES ON restivio_$service.* TO 'restivio_$service'@'%';
SQL
done
