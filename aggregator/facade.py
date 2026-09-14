from services.component_add_service import ComponentAddService
from services.component_details_service import ComponentDetailSection
from services.server_details_service import ServerDetailsService

class Facade:
    def __init__(self):
        self.component_service = ComponentAddService()
        self.component_tree_section = ComponentDetailSection()
        self.server_details_service = ServerDetailsService()

# Singleton facade
facade = Facade()
