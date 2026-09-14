from loguru import logger

from models.table_preferences_models import (
    FetchTablePreferencesResponse,
    SaveTablePreferencesResponse,
)


class TablePreferencesSection:
    def __init__(self, db):
        self.db = db

    def get(self, user_id: int, table_key: str) -> FetchTablePreferencesResponse:
        logger.info("Fetching table preferences for user_id={} table_key={}.", user_id, table_key)
        columns = self.db.fetch_table_preferences(user_id, table_key)
        return FetchTablePreferencesResponse(status_code=200, columns=columns)

    def save(self, user_id: int, table_key: str, columns: list) -> SaveTablePreferencesResponse:
        logger.info("Saving table preferences for user_id={} table_key={}.", user_id, table_key)
        self.db.upsert_table_preferences(user_id, table_key, columns)
        return SaveTablePreferencesResponse(status_code=200, columns=columns)
