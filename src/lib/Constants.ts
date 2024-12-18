import useWindowDimensions from "./useWindowDimensions";

export const Colors = {
    background: '#17171E',
    lightBackground: '#1A1A22',
    darkBackground: '#121217',
    text: '#FFF',
    primaryLight: '#FCC679',
    primaryRegular: '#FA9D17',
    primaryDark: '#df8605',
    secondaryLight: '#e293ae',
    secondaryRegular: '#F2729F', //#ff76a6
    secondaryDark: '#CA3C6D', //CA3C6D, ae2f5b
    tertiaryLight: '#b5aff7',
    tertiaryRegular: '#9991F4',
    tertiaryDark: '#6E63EF',
    green: "#28a850",
    darkerGreen: "#20a85a",
    red: "#e64640",
}

export const radius = 10;
export const padding = 12;
export const smallPadding = 7;

export const useFdim = () => {
    const window = useWindowDimensions();
    const fdim = (window.height && window.width ? Math.min(window.height * 0.5, window.width) : 650) * 1.5;
    return Math.min(Math.max(fdim, 800), 1000);
}
