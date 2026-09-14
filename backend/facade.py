from subsystems.database import Database
from subsystems.aws import AWS

from models.authentication_models import *

from sections.component_section import ComponentSection
from sections.schedules_section import SchedulesSection
from sections.ec2_details_section import EC2DetailsSection
from sections.server_control_section import ServerControlSection
from sections.route53_section import Route53Section
from sections.component_tree_section import ComponentTreeSection
from sections.component_details_section import ComponentDetailsSection
from sections.lambda_section import LambdaSection
from sections.ecs_section import ECSSection
from sections.eks_section import EKSSection
from sections.msk_section import MSKSection
from sections.redis_section import RedisSection
from sections.loadbalancer_section import LoadBalancerSection
from sections.elasticache_section import ElastiCacheSection
from sections.datadog_metrics_section import DatadogMetricsSection
from sections.server_details_section import ServerDetailsSection
from sections.table_preferences_section import TablePreferencesSection
from sections.watcher_control_section import WatcherControlSection
from services.authentication_service import AuthenticationService
from utils.config import load_config

class Facade:
    def __init__(self):
        self.config = load_config()

        self.db = Database(db_config=self.config.get("db_config", {}))
        self.aws = AWS(config=self.config)
        self.auth = AuthenticationService(db=self.db)

        self.component_section = ComponentSection(db=self.db, config=self.config)
        self.schedules_section = SchedulesSection(db=self.db, config=self.config)
        self.ec2_details_section = EC2DetailsSection(db=self.db, aws=self.aws, config=self.config)
        self.server_control_section = ServerControlSection(db=self.db, aws=self.aws, config=self.config)
        self.route53_section = Route53Section(aws=self.aws, config=self.config)
        self.component_tree_section = ComponentTreeSection()
        self.component_details_section = ComponentDetailsSection()
        self.lambda_section = LambdaSection(db=self.db, aws=self.aws, config=self.config)
        self.ecs_section = ECSSection(db=self.db, aws=self.aws, config=self.config)
        self.eks_section = EKSSection(db=self.db, aws=self.aws, config=self.config)
        self.msk_section = MSKSection(db=self.db, aws=self.aws, config=self.config)
        self.redis_section = RedisSection(db=self.db, aws=self.aws, config=self.config)
        self.loadbalancer_section = LoadBalancerSection(db=self.db, aws=self.aws, config=self.config)
        self.elasticache_section = ElastiCacheSection(db=self.db, aws=self.aws, config=self.config)
        self.datadog_metrics_section = DatadogMetricsSection(config=self.config)
        self.server_details_section = ServerDetailsSection(
            db=self.db,
            aws=self.aws,
            config=self.config,
            datadog_metrics=self.datadog_metrics_section,
        )
        self.table_preferences_section = TablePreferencesSection(db=self.db)
        self.watcher_control_section = WatcherControlSection(db=self.db, config=self.config)


facade = Facade()

