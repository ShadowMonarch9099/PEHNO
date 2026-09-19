"""
Dialect-portable query helpers.
"""
from sqlalchemy import Boolean, exists, func, literal, select
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.sql.expression import ColumnElement


class DialectSwitch(ColumnElement):
    """Boolean expression rendered as `pg` on Postgres and `other` everywhere else."""

    inherit_cache = False
    type = Boolean()

    def __init__(self, pg: ColumnElement, other: ColumnElement) -> None:
        self.pg = pg
        self.other = other

    @property
    def _from_objects(self):  # keep FROM-clause discovery working
        return []


@compiles(DialectSwitch)
def _compile_switch(element: DialectSwitch, compiler, **kw):
    expr = element.pg if compiler.dialect.name == "postgresql" else element.other
    return compiler.process(expr, **kw)


def json_list_contains(column, value: str) -> ColumnElement:
    """
    `value` ∈ JSON-array `column`. Postgres: JSONB containment (GIN-indexable).
    SQLite: json_each scan. Chosen at compile time, so one query works on both.
    """
    pg = column.cast(JSONB).contains([value])
    each = func.json_each(column).table_valued("value")
    other = exists(select(literal(1)).select_from(each).where(each.c.value == value))
    return DialectSwitch(pg=pg, other=other)
