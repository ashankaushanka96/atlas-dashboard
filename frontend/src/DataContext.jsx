import { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";
import { backendDomain } from "./Config";
import PropTypes from "prop-types";

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [awsRegions, setAWSRegions] = useState([]);
  const [allRegions, setAllRegions] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [awsIPs, setAWSIPs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAWSRegions = async () => {
    setLoading(true);
    const url = `${backendDomain}/schedules/aws/fetch-available-regions`;
    try {
      const response = await axios.get(url);
      setAWSRegions(response.data.regions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllRegions = async () => {
    setLoading(true);
    const url = `${backendDomain}/components/fetch-all-regions`;
    try {
      const response = await axios.get(url);
      setAllRegions(response.data.regions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlatforms = async () => {
    setLoading(true);
    const url = `${backendDomain}/components/fetch-platforms`;
    try {
      const response = await axios.get(url);
      setPlatforms(response.data.platforms);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchAWSIPs = async () => {
    setLoading(true);
    const url = `${backendDomain}/schedules/aws/fetch-ips`;
    try {
      const response = await axios.get(url);
      setAWSIPs(response.data.ips);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchAllRegions();
    fetchAWSRegions();
    fetchPlatforms();
    fetchAWSIPs();
  }, []);

  return (
    <DataContext.Provider
      value={{
        awsRegions,
        allRegions,
        platforms,
        awsIPs,
        loading,
        error,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};

DataProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
