import Spinner from 'react-bootstrap/Spinner';

import '../App.css'
import { Colors } from '../lib/Constants';

export function DisplayOrLoading(props: {children?: JSX.Element, condition: boolean, loadingScreen?: JSX.Element}) {
    const LoadingScreen = () => {

        // useEffect(() => {
        //     const handleBeforeUnload = (event: Event) => {
        //       event.preventDefault();
        //       // Custom logic to handle the refresh
        //       // Display a confirmation message or perform necessary actions
        //     };
        //     window.addEventListener('beforeunload', handleBeforeUnload);
        //     return () => {
        //       window.removeEventListener('beforeunload', handleBeforeUnload);
        //     };
        //   }, []);
        
        return(
        props.loadingScreen ?? 
        <div className="App-header">
        <Spinner style={{color: Colors.primaryRegular, width: 75, height: 75}}/>
        <br></br>
        
        </div>);
    }

    return( props.condition ?
        props.children ?? <></>
        : <LoadingScreen/>
    )
}