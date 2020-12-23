begin;

-- create table & index
create table email_change (
    id serial primary key not null,
    user_id uuid not null,
    old_email varchar(256) not null,
    old_conf_key uuid not null,
    old_conf_on timestamp without time zone default null,
    new_email varchar(256) not null,
    new_conf_key uuid not null,
    new_conf_on timestamp without time zone default null,
    created timestamp without time zone default current_timestamp not null
);
create index on email_change (user_id);

commit;
