create table cliente (
    cpf char(11) not null primary key,
    nome varchar(100) not null,
    nascimento date not null default current_date,
    cep char(8) not null,
    numerocasa varchar(5)
);

create table tipo_instrumento (
    id serial not null primary key,
    nome varchar(25),
    descricao text
);

create table instrumento_estoque (
    id serial primary key,
    modelo varchar(125) not null,
    tipo_id integer not null references tipo_instrumento(id),
    preco numeric(10, 2) not null default 1 check (preco >= 0)
);

create table instrumento_conserto (
    id serial primary key,
    modelo varchar(125) not null,
    estado text not null check (estado in ('nao reparado', 'em conserto', 'reparado')),
    enviado_por char(11) not null references cliente(cpf),
    tipo_id integer not null references tipo_instrumento(id)
);