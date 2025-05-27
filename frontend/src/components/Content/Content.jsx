import PropTypes from "prop-types";
import ComponentsSection from "../ComponentsSection/ComponentsSection";
import S3ServerCards from "../S3ServerCards/S3ServerCards";
import SchedulerSection from "../SchedulerSection/SchedulerSection";
import EC2DetailsSection from "../EC2DetailsSection/EC2DetailsSection";
import ZoneDashboard from "../Route53/ZoneDashboard";

function Content({ pathname }) {
  let content;

  if (pathname.includes("components")) {
    content = <ComponentsSection />;
  } else if (pathname.includes("s3logs")) {
    content = <S3ServerCards />;
  } else if (pathname.includes("schedule")) {
    content = <SchedulerSection />;
  } else if (pathname.includes("ec2details")) {
    content = <EC2DetailsSection />;
  } else if (pathname.includes("route53")) {
    content = <ZoneDashboard />;
  }else {
    content = <ComponentsSection />;
  }

  return content;
}

Content.propTypes = {
  pathname: PropTypes.string.isRequired,
};

export default Content;
